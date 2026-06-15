"""
Vercel Serverless Function — FastAPI app.

All backend routes are served from this single entry point.
Vercel rewrites /api/* → this handler via vercel.json.
SQLite lives in /tmp/ (ephemeral but works within a warm instance).
"""

import logging
import os
import math
import csv
import io
import re
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import date, datetime
from statistics import median
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, Column, Date, Float, Integer, String, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Database (SQLite in /tmp for Vercel)
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite+aiosqlite:////tmp/transactions.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=True)
    anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_explanation = Column(String(1000), nullable=True)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class TransactionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    description: str
    amount: float
    category: Optional[str] = None
    anomaly: bool = False
    anomaly_explanation: Optional[str] = Field(default=None, alias="anomalyExplanation")

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class CategorySummarySchema(BaseModel):
    category: str
    total_amount: float = Field(alias="totalAmount")
    transaction_count: int = Field(alias="transactionCount")
    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class AnomalySchema(BaseModel):
    transaction_id: int = Field(alias="transactionId")
    date: date
    description: str
    amount: float
    category: str
    explanation: str
    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class UploadResponseSchema(BaseModel):
    message: str
    transaction_count: int = Field(alias="transactionCount")
    transactions: list[TransactionSchema]
    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class MessageSchema(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# LLM Client
# ---------------------------------------------------------------------------
_llm_client = None
_llm_available = False
_model_name = "claude-sonnet-4-6"


def _get_llm_client():
    global _llm_client, _llm_available
    if _llm_client is not None:
        return _llm_client
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        logger.warning("No ANTHROPIC_API_KEY — using keyword fallback")
        _llm_available = False
        return None
    try:
        import anthropic
        _llm_client = anthropic.Anthropic(api_key=api_key)
        _llm_available = True
        logger.info("LLM client initialized: %s", _model_name)
        return _llm_client
    except Exception as e:
        logger.error("Failed to init Anthropic client: %s", e)
        _llm_available = False
        return None


def llm_is_available() -> bool:
    _get_llm_client()
    return _llm_available


def llm_chat(system_prompt: str, user_prompt: str) -> str:
    client = _get_llm_client()
    if client is None:
        raise RuntimeError("LLM client not configured")
    message = client.messages.create(
        model=_model_name,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    if message.content and len(message.content) > 0:
        return message.content[0].text.strip()
    return ""


# ---------------------------------------------------------------------------
# CSV Parser
# ---------------------------------------------------------------------------
DATE_FORMATS = [
    "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m/%d/%y", "%Y/%m/%d",
    "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S",
    "%b %d, %Y", "%B %d, %Y", "%d %b %Y",
]

_VERTICAL_LABELS = {
    "account overview", "transaction details", "transaction detail",
    "transaction date", "posted on", "posted date", "date posted",
    "from account", "to account", "balance", "description", "amount",
    "date", "status", "type", "category", "details",
}


def parse_date_str(date_str: str) -> date:
    cleaned = date_str.strip().split("T")[0]
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date: '{date_str}'")


def parse_csv_content(content: str) -> list[dict]:
    rows = list(csv.reader(io.StringIO(content)))
    transactions = _parse_rows(rows)
    if not transactions:
        transactions = _parse_vertical(rows)
    if not transactions:
        raise ValueError("No valid transactions found.")
    return transactions


def _parse_rows(rows):
    transactions = []
    for row in rows:
        if not row:
            continue
        tx_date = None
        date_idx = -1
        for i, cell in enumerate(row):
            if not cell.strip():
                continue
            try:
                tx_date = parse_date_str(cell)
                date_idx = i
                break
            except ValueError:
                pass
        if not tx_date:
            continue
        floats = []
        for i, cell in enumerate(row):
            if i == date_idx:
                continue
            cleaned = cell.strip().replace('$', '').replace(',', '')
            if not cleaned:
                continue
            try:
                val = float(cleaned)
                floats.append((i, val))
            except ValueError:
                pass
        if not floats:
            continue
        first_float_idx, first_float_val = floats[0]
        amount = first_float_val
        amount_idx = first_float_idx
        if amount > 0 and amount_idx > 0 and not row[amount_idx - 1].strip():
            amount = -amount
        remaining_strings = []
        for i, cell in enumerate(row):
            if i != date_idx and i != amount_idx and cell.strip():
                try:
                    float(cell.strip().replace('$', '').replace(',', ''))
                except ValueError:
                    remaining_strings.append(cell.strip())
        if remaining_strings:
            if date_idx + 1 < len(row) and row[date_idx + 1].strip() in remaining_strings:
                description = row[date_idx + 1].strip()
            else:
                description = max(remaining_strings, key=len)
        else:
            description = "Unknown Transaction"
        transactions.append({"date": tx_date, "description": description[:500], "amount": amount})
    return transactions


def _amount_from_cell(cell: str):
    raw = cell.strip()
    if "$" not in raw and "." not in raw:
        return None
    cleaned = raw.replace("$", "").replace(",", "").strip()
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    cleaned = cleaned.strip("()")
    try:
        val = float(cleaned)
    except ValueError:
        return None
    return -val if negative else val


def _parse_vertical(rows):
    tx_date = None
    posted_date = None
    for row in rows:
        for i, cell in enumerate(row):
            low = cell.strip().lower()
            if low == "transaction date":
                for nxt in row[i + 1:]:
                    try:
                        tx_date = parse_date_str(nxt)
                        break
                    except ValueError:
                        continue
            elif low in ("posted on", "posted date", "date posted"):
                for nxt in row[i + 1:]:
                    try:
                        posted_date = parse_date_str(nxt)
                        break
                    except ValueError:
                        continue
    final_date = tx_date or posted_date
    amounts = []
    descriptions = []
    order = 0
    for row in rows:
        for cell in row:
            order += 1
            c = cell.strip()
            if not c:
                continue
            amt = _amount_from_cell(c)
            if amt is not None:
                amounts.append((order, amt))
                continue
            low = c.lower()
            if low in _VERTICAL_LABELS:
                continue
            if "http" in low or "://" in low:
                continue
            if c.startswith("*"):
                continue
            if "am" in low.split() or "pm" in low.split() or "am," in low or "pm," in low:
                continue
            try:
                parse_date_str(c)
                continue
            except ValueError:
                pass
            if not any(ch.isalpha() for ch in c):
                continue
            descriptions.append((order, c))
    if not amounts:
        return []
    if final_date is None:
        for row in rows:
            for cell in row:
                try:
                    final_date = parse_date_str(cell.split(",")[0])
                    break
                except ValueError:
                    continue
            if final_date:
                break
    if final_date is None:
        return []
    transactions = []
    for amt_order, amt_val in amounts:
        desc = "Unknown Transaction"
        preceding = [d for o, d in descriptions if o < amt_order]
        following = [d for o, d in descriptions if o > amt_order]
        if preceding:
            desc = preceding[-1]
        elif following:
            desc = following[0]
        transactions.append({"date": final_date, "description": desc[:500], "amount": amt_val})
    return transactions


# ---------------------------------------------------------------------------
# Categorizer
# ---------------------------------------------------------------------------
VALID_CATEGORIES = ["Groceries", "Subscriptions", "Transport", "Dining", "Utilities", "Entertainment", "Income", "Other"]

CATEGORIZER_SYSTEM_PROMPT = """You are a bank transaction categorizer. For each transaction description provided,
assign exactly ONE category from this list:
- Groceries, Subscriptions, Transport, Dining, Utilities, Entertainment, Income, Other

Respond with ONLY the category names, one per line, in the same order as the input.
Do not include numbers, bullets, explanations, or any other text."""

KEYWORD_MAP = {
    "Groceries": ["loblaws", "no frills", "metro grocery", "sobeys", "whole foods", "costco", "walmart grocery", "freshco", "food basics", "t&t"],
    "Dining": ["tim hortons", "mcdonalds", "mcdonald", "swiss chalet", "uber eats", "skip the dishes", "doordash", "restaurant", "cafe", "pizza", "sushi", "starbucks", "subway", "wendy", "burger", "kfc", "popeyes"],
    "Transport": ["presto", "uber *trip", "lyft", "petro-canada", "shell station", "esso", "gas station", "parking", "go transit", "ttc", "taxi"],
    "Subscriptions": ["netflix", "spotify", "apple.com/bill", "amazon prime", "disney+", "youtube premium", "xbox game pass", "adobe", "microsoft 365"],
    "Utilities": ["toronto hydro", "enbridge gas", "rogers", "bell mobility", "bell canada", "telus", "koodo", "fido", "virgin mobile", "hydro", "water bill"],
    "Entertainment": ["cineplex", "steam purchase", "xbox", "playstation", "nintendo", "ticketmaster", "live nation", "concert", "theatre", "museum"],
    "Income": ["payroll", "salary", "deposit", "e-transfer received", "interac e-transfer received", "direct deposit", "refund", "cashback"],
}

MERCHANT_OVERRIDES = {"interninsid": "Subscriptions"}


def categorize_by_keyword(description: str) -> str:
    lower = description.lower()
    for category, keywords in KEYWORD_MAP.items():
        for keyword in keywords:
            if keyword in lower:
                return category
    return "Other"


def _normalize_category(raw: str) -> str:
    cleaned = re.sub(r"^\d+\.\s*", "", raw).strip()
    cleaned = re.sub(r"^-\s*", "", cleaned).strip()
    for valid in VALID_CATEGORIES:
        if valid.lower() == cleaned.lower():
            return valid
    lower = cleaned.lower()
    for valid in VALID_CATEGORIES:
        if valid.lower() in lower:
            return valid
    return "Other"


def categorize_transactions(transactions: list[dict]) -> list[dict]:
    for tx in transactions:
        if tx["amount"] < 0:
            tx["category"] = "Income"
    for tx in transactions:
        if "category" not in tx:
            lower = tx["description"].lower()
            for needle, category in MERCHANT_OVERRIDES.items():
                if needle in lower:
                    tx["category"] = category
                    break
    to_categorize = [(i, tx["description"], tx["amount"]) for i, tx in enumerate(transactions) if "category" not in tx]
    if not to_categorize:
        return transactions
    if llm_is_available():
        BATCH_SIZE = 15
        for start in range(0, len(to_categorize), BATCH_SIZE):
            batch = to_categorize[start:start + BATCH_SIZE]
            descriptions = [(desc, amt) for _, desc, amt in batch]
            lines_prompt = ["Categorize each of these bank transactions:\n"]
            for i, (desc, amt) in enumerate(descriptions, 1):
                lines_prompt.append(f"{i}. {desc} (amount: {amt})")
            prompt = "\n".join(lines_prompt)
            try:
                response = llm_chat(CATEGORIZER_SYSTEM_PROMPT, prompt)
                lines = [line.strip() for line in response.split("\n") if line.strip()]
                for i, (idx, desc, _) in enumerate(batch):
                    if i < len(lines):
                        transactions[idx]["category"] = _normalize_category(lines[i])
                    else:
                        transactions[idx]["category"] = categorize_by_keyword(desc)
            except Exception:
                for idx, desc, _ in batch:
                    transactions[idx]["category"] = categorize_by_keyword(desc)
    else:
        for idx, desc, _ in to_categorize:
            transactions[idx]["category"] = categorize_by_keyword(desc)
    return transactions


# ---------------------------------------------------------------------------
# Anomaly Detector
# ---------------------------------------------------------------------------
ANOMALY_SYSTEM_PROMPT = """You are a financial advisor explaining spending anomalies to a user.
Give a brief, one-sentence, plain-language explanation for why a transaction
might be flagged as unusual. Be specific and helpful."""

SIGMA_MULTIPLIER = 2.0
MEDIAN_MULTIPLIER = 3.0


def detect_anomalies(transactions: list[dict]) -> list[dict]:
    by_category: dict[str, list[int]] = defaultdict(list)
    for i, tx in enumerate(transactions):
        cat = tx.get("category")
        if cat and cat != "Income" and tx.get("amount", 0) > 0:
            by_category[cat].append(i)
    flagged = []
    for category, indices in by_category.items():
        if len(indices) < 2:
            continue
        amounts = [transactions[i]["amount"] for i in indices]
        med = float(median(amounts))
        deviations = [abs(a - med) for a in amounts]
        mad = float(median(deviations)) if len(deviations) > 1 else 0.0
        mad_threshold = med + SIGMA_MULTIPLIER * mad * 1.4826
        median_threshold = med * MEDIAN_MULTIPLIER
        threshold = min(mad_threshold, median_threshold)
        for idx in indices:
            tx = transactions[idx]
            if tx["amount"] > threshold:
                tx["anomaly"] = True
                if llm_is_available():
                    try:
                        ratio = tx["amount"] / med if med > 0 else 0
                        prompt = (
                            f"Transaction: '{tx['description']}' for ${tx['amount']:.2f} in '{category}'. "
                            f"Typical spending: ${med:.2f}. This is {ratio:.1f}x typical. "
                            f"Explain in one sentence why this is unusual."
                        )
                        tx["anomaly_explanation"] = llm_chat(ANOMALY_SYSTEM_PROMPT, prompt)
                    except Exception:
                        tx["anomaly_explanation"] = (
                            f"This {tx['description']} transaction of ${tx['amount']:.2f} is significantly higher "
                            f"than your typical spending of ${med:.2f} in {category}."
                        )
                else:
                    tx["anomaly_explanation"] = (
                        f"This {tx['description']} transaction of ${tx['amount']:.2f} is significantly higher "
                        f"than your typical spending of ${med:.2f} in {category}."
                    )
                flagged.append(tx)
    return flagged


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(application: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    yield
    await engine.dispose()


app = FastAPI(title="Smart Transaction Categorizer", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/api/transactions/upload")
async def upload_csv(file: UploadFile, db: AsyncSession = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    try:
        content = await file.read()
        text = content.decode("utf-8-sig")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    try:
        parsed = parse_csv_content(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    categorize_transactions(parsed)
    db_transactions = []
    for tx_data in parsed:
        tx = Transaction(
            date=tx_data["date"], description=tx_data["description"],
            amount=tx_data["amount"], category=tx_data.get("category"),
            anomaly=False, anomaly_explanation=None,
        )
        db.add(tx)
        db_transactions.append(tx)
    await db.commit()
    for tx in db_transactions:
        await db.refresh(tx)
    result = await db.execute(select(Transaction))
    all_txns = result.scalars().all()
    all_dicts = [
        {"id": t.id, "date": t.date, "description": t.description,
         "amount": t.amount, "category": t.category,
         "anomaly": t.anomaly, "anomaly_explanation": t.anomaly_explanation}
        for t in all_txns
    ]
    detect_anomalies(all_dicts)
    for tx_dict in all_dicts:
        if tx_dict.get("anomaly"):
            tx_obj = await db.get(Transaction, tx_dict["id"])
            if tx_obj:
                tx_obj.anomaly = True
                tx_obj.anomaly_explanation = tx_dict.get("anomaly_explanation")
    await db.commit()
    for tx in db_transactions:
        await db.refresh(tx)
    schemas = [
        TransactionSchema(
            id=tx.id, date=tx.date, description=tx.description,
            amount=tx.amount, category=tx.category, anomaly=tx.anomaly,
            anomalyExplanation=tx.anomaly_explanation,
        )
        for tx in db_transactions
    ]
    return UploadResponseSchema(
        message=f"Successfully processed {len(schemas)} transactions",
        transactionCount=len(schemas), transactions=schemas,
    ).model_dump()


@app.get("/api/transactions")
async def get_all_transactions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transaction).order_by(Transaction.date.desc()))
    transactions = result.scalars().all()
    return [
        TransactionSchema(
            id=tx.id, date=tx.date, description=tx.description,
            amount=tx.amount, category=tx.category, anomaly=tx.anomaly,
            anomalyExplanation=tx.anomaly_explanation,
        ).model_dump()
        for tx in transactions
    ]


@app.get("/api/transactions/summary")
async def get_category_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction.category, func.sum(Transaction.amount), func.count(Transaction.id))
        .where(Transaction.category.isnot(None))
        .group_by(Transaction.category)
    )
    rows = result.all()
    return [
        CategorySummarySchema(category=row[0], totalAmount=round(row[1], 2), transactionCount=row[2]).model_dump()
        for row in rows
    ]


@app.get("/api/transactions/anomalies")
async def get_anomalies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction).where(Transaction.anomaly == True).order_by(Transaction.amount.desc())
    )
    transactions = result.scalars().all()
    return [
        AnomalySchema(
            transactionId=tx.id, date=tx.date, description=tx.description,
            amount=tx.amount, category=tx.category or "Other",
            explanation=tx.anomaly_explanation or "This transaction is unusually high compared to your typical spending.",
        ).model_dump()
        for tx in transactions
    ]


@app.delete("/api/transactions")
async def delete_all_transactions(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Transaction))
    await db.commit()
    return MessageSchema(message="All transactions deleted").model_dump()
