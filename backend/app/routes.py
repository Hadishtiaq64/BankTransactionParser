"""
API routes for the Smart Transaction Categorizer.

Endpoints match the frontend contract exactly:
  POST   /api/transactions/upload     — Upload CSV
  GET    /api/transactions            — List all
  GET    /api/transactions/summary    — Category breakdown
  GET    /api/transactions/anomalies  — Flagged anomalies
  DELETE /api/transactions            — Delete all
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import Transaction
from .schemas import (
    AnomalySchema,
    CategorySummarySchema,
    MessageSchema,
    TransactionSchema,
    UploadResponseSchema,
)
from .services import anomaly_detector, categorizer, csv_parser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("/upload")
async def upload_csv(file: UploadFile, db: AsyncSession = Depends(get_db)):
    """Upload a CSV file of bank transactions. Parses, categorizes, and detects anomalies."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    try:
        content = await file.read()
        text = content.decode("utf-8-sig")  # Handle BOM
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    # 1. Parse CSV
    try:
        parsed = csv_parser.parse_csv(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Categorize
    categorizer.categorize_transactions(parsed)

    # 3. Save to database
    db_transactions = []
    for tx_data in parsed:
        tx = Transaction(
            date=tx_data["date"],
            description=tx_data["description"],
            amount=tx_data["amount"],
            category=tx_data.get("category"),
            anomaly=False,
            anomaly_explanation=None,
        )
        db.add(tx)
        db_transactions.append(tx)

    await db.commit()

    # Refresh to get IDs
    for tx in db_transactions:
        await db.refresh(tx)

    # 4. Anomaly detection across ALL transactions
    result = await db.execute(select(Transaction))
    all_txns = result.scalars().all()

    # Convert to dicts for anomaly detection
    all_dicts = [
        {
            "id": t.id,
            "date": t.date,
            "description": t.description,
            "amount": t.amount,
            "category": t.category,
            "anomaly": t.anomaly,
            "anomaly_explanation": t.anomaly_explanation,
        }
        for t in all_txns
    ]

    anomaly_detector.detect_anomalies(all_dicts)

    # Update anomaly flags in DB
    for tx_dict in all_dicts:
        if tx_dict.get("anomaly"):
            tx_obj = await db.get(Transaction, tx_dict["id"])
            if tx_obj:
                tx_obj.anomaly = True
                tx_obj.anomaly_explanation = tx_dict.get("anomaly_explanation")

    await db.commit()

    # Refresh the newly created transactions
    for tx in db_transactions:
        await db.refresh(tx)

    # Build response
    schemas = []
    for tx in db_transactions:
        schemas.append(
            TransactionSchema(
                id=tx.id,
                date=tx.date,
                description=tx.description,
                amount=tx.amount,
                category=tx.category,
                anomaly=tx.anomaly,
                anomalyExplanation=tx.anomaly_explanation,
            )
        )

    return UploadResponseSchema(
        message=f"Successfully processed {len(schemas)} transactions",
        transactionCount=len(schemas),
        transactions=schemas,
    ).model_dump()


@router.get("")
async def get_all_transactions(db: AsyncSession = Depends(get_db)):
    """Get all transactions."""
    result = await db.execute(select(Transaction).order_by(Transaction.date.desc()))
    transactions = result.scalars().all()

    return [
        TransactionSchema(
            id=tx.id,
            date=tx.date,
            description=tx.description,
            amount=tx.amount,
            category=tx.category,
            anomaly=tx.anomaly,
            anomalyExplanation=tx.anomaly_explanation,
        ).model_dump()
        for tx in transactions
    ]


@router.get("/summary")
async def get_category_summary(db: AsyncSession = Depends(get_db)):
    """Get spending summary grouped by category."""
    result = await db.execute(
        select(
            Transaction.category,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
        )
        .where(Transaction.category.isnot(None))
        .group_by(Transaction.category)
    )
    rows = result.all()

    return [
        CategorySummarySchema(
            category=row[0],
            totalAmount=round(row[1], 2),
            transactionCount=row[2],
        ).model_dump()
        for row in rows
    ]


@router.get("/anomalies")
async def get_anomalies(db: AsyncSession = Depends(get_db)):
    """Get all flagged anomalies with explanations."""
    result = await db.execute(
        select(Transaction).where(Transaction.anomaly == True).order_by(  # noqa: E712
            Transaction.amount.desc()
        )
    )
    transactions = result.scalars().all()

    return [
        AnomalySchema(
            transactionId=tx.id,
            date=tx.date,
            description=tx.description,
            amount=tx.amount,
            category=tx.category or "Other",
            explanation=tx.anomaly_explanation
            or "This transaction is unusually high compared to your typical spending.",
        ).model_dump()
        for tx in transactions
    ]


@router.delete("")
async def delete_all_transactions(db: AsyncSession = Depends(get_db)):
    """Delete all transactions."""
    await db.execute(delete(Transaction))
    await db.commit()
    logger.info("All transactions deleted")
    return MessageSchema(message="All transactions deleted").model_dump()
