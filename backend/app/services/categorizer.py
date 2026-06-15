"""
Transaction categorizer with dual strategy:
  1. Claude Sonnet 4.6 LLM (batched, 15 per call)
  2. Keyword-based fallback when no API key is set
"""

import logging

from . import llm_client

logger = logging.getLogger(__name__)

VALID_CATEGORIES = [
    "Groceries",
    "Subscriptions",
    "Transport",
    "Dining",
    "Utilities",
    "Entertainment",
    "Income",
    "Other",
]

SYSTEM_PROMPT = """You are a bank transaction categorizer. For each transaction description provided,
assign exactly ONE category from this list:
- Groceries
- Subscriptions
- Transport
- Dining
- Utilities
- Entertainment
- Income
- Other

Respond with ONLY the category names, one per line, in the same order as the input.
Do not include numbers, bullets, explanations, or any other text."""

BATCH_SIZE = 15

# Manual merchant overrides. These take priority over BOTH the LLM and the
# keyword fallback, so they reliably fix merchants the AI can't recognize
# (e.g. names truncated by the bank like "WWW.INTERNINSID").
#
# Match is a case-insensitive substring test against the transaction
# description, so partial/truncated names still match. Add your own below.
MERCHANT_OVERRIDES: dict[str, str] = {
    "interninsid": "Subscriptions",  # WWW.INTERNINSID -> InternInsider
}


def categorize_by_override(description: str) -> str | None:
    """Return a forced category if the description matches a known merchant, else None."""
    lower = description.lower()
    for needle, category in MERCHANT_OVERRIDES.items():
        if needle in lower:
            return category
    return None


# Keyword mappings for fallback categorization
KEYWORD_MAP: dict[str, list[str]] = {
    "Groceries": [
        "loblaws", "no frills", "metro grocery", "sobeys", "whole foods",
        "costco", "walmart grocery", "freshco", "food basics", "t&t",
    ],
    "Dining": [
        "tim hortons", "mcdonalds", "mcdonald", "swiss chalet", "uber eats",
        "skip the dishes", "doordash", "restaurant", "cafe", "pizza", "sushi",
        "starbucks", "subway", "wendy", "burger", "kfc", "popeyes",
    ],
    "Transport": [
        "presto", "uber *trip", "lyft", "petro-canada", "shell station",
        "esso", "gas station", "parking", "go transit", "ttc", "taxi",
    ],
    "Subscriptions": [
        "netflix", "spotify", "apple.com/bill", "amazon prime", "disney+",
        "youtube premium", "xbox game pass", "adobe", "microsoft 365",
    ],
    "Utilities": [
        "toronto hydro", "enbridge gas", "rogers", "bell mobility", "bell canada",
        "telus", "koodo", "fido", "virgin mobile", "hydro", "water bill",
    ],
    "Entertainment": [
        "cineplex", "steam purchase", "xbox", "playstation", "nintendo",
        "ticketmaster", "live nation", "concert", "theatre", "museum",
    ],
    "Income": [
        "payroll", "salary", "deposit", "e-transfer received",
        "interac e-transfer received", "direct deposit", "refund", "cashback",
    ],
}


def categorize_by_keyword(description: str) -> str:
    """
    Keyword-based fallback categorization.
    Returns the first matching category or 'Other'.
    """
    lower = description.lower()

    for category, keywords in KEYWORD_MAP.items():
        for keyword in keywords:
            if keyword in lower:
                return category

    return "Other"


def _normalize_category(raw: str) -> str:
    """Normalize LLM output to a valid category name."""
    import re

    cleaned = re.sub(r"^\d+\.\s*", "", raw).strip()
    cleaned = re.sub(r"^-\s*", "", cleaned).strip()

    for valid in VALID_CATEGORIES:
        if valid.lower() == cleaned.lower():
            return valid

    # Fuzzy: check if response contains a valid category
    lower = cleaned.lower()
    for valid in VALID_CATEGORIES:
        if valid.lower() in lower:
            return valid

    logger.warning("Unrecognized category from LLM: '%s', defaulting to 'Other'", raw)
    return "Other"


def _build_batch_prompt(descriptions: list[tuple[str, float]]) -> str:
    """Build a numbered prompt for batch categorization."""
    lines = ["Categorize each of these bank transactions:\n"]
    for i, (desc, amount) in enumerate(descriptions, 1):
        lines.append(f"{i}. {desc} (amount: {amount})")
    return "\n".join(lines)


def _categorize_batch_llm(
    items: list[tuple[int, str, float]],
) -> dict[int, str]:
    """
    Categorize a batch using LLM.
    items: list of (index, description, amount)
    Returns: {index: category}
    """
    descriptions = [(desc, amt) for _, desc, amt in items]
    prompt = _build_batch_prompt(descriptions)

    try:
        response = llm_client.chat(SYSTEM_PROMPT, prompt)
        lines = [line.strip() for line in response.split("\n") if line.strip()]

        result: dict[int, str] = {}
        for i, (idx, desc, _) in enumerate(items):
            if i < len(lines):
                result[idx] = _normalize_category(lines[i])
            else:
                result[idx] = categorize_by_keyword(desc)

        return result
    except Exception as e:
        logger.error("LLM batch categorization failed: %s", e)
        return {idx: categorize_by_keyword(desc) for idx, desc, _ in items}


def categorize_transactions(
    transactions: list[dict],
) -> list[dict]:
    """
    Categorize a list of transaction dicts in-place.
    Each dict has: date, description, amount, and will get 'category' added.

    Uses LLM if available, otherwise keyword fallback.
    """
    # Pre-categorize negative amounts as Income
    for tx in transactions:
        if tx["amount"] < 0:
            tx["category"] = "Income"

    # Manual merchant overrides take priority over the LLM and keyword fallback.
    for tx in transactions:
        if "category" not in tx:
            override = categorize_by_override(tx["description"])
            if override:
                tx["category"] = override

    to_categorize = [
        (i, tx["description"], tx["amount"])
        for i, tx in enumerate(transactions)
        if "category" not in tx
    ]

    if not to_categorize:
        return transactions

    if llm_client.is_available():
        logger.info(
            "Categorizing %d transactions via LLM in batches of %d",
            len(to_categorize),
            BATCH_SIZE,
        )
        for start in range(0, len(to_categorize), BATCH_SIZE):
            batch = to_categorize[start : start + BATCH_SIZE]
            results = _categorize_batch_llm(batch)
            for idx, category in results.items():
                transactions[idx]["category"] = category
    else:
        logger.info(
            "Using keyword fallback for %d transactions", len(to_categorize)
        )
        for idx, desc, _ in to_categorize:
            transactions[idx]["category"] = categorize_by_keyword(desc)

    return transactions
