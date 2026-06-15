"""
Anomaly detection using robust statistics (median + MAD) per category.
Flags unusually large transactions and generates LLM explanations.

Uses median-based statistics to prevent outliers from inflating the threshold
and masking themselves — a common problem with mean + stddev on small datasets.
"""

import logging
import math
from collections import defaultdict
from statistics import median

from . import llm_client

logger = logging.getLogger(__name__)

SIGMA_MULTIPLIER = 2.0
MEDIAN_MULTIPLIER = 3.0  # Secondary rule: flag anything > 3x the median
MIN_TRANSACTIONS_FOR_DETECTION = 2

SYSTEM_PROMPT = """You are a financial advisor explaining spending anomalies to a user.
Give a brief, one-sentence, plain-language explanation for why a transaction
might be flagged as unusual. Be specific and helpful."""


def calculate_mean(amounts: list[float]) -> float:
    """Calculate the arithmetic mean."""
    if not amounts:
        return 0.0
    return sum(amounts) / len(amounts)


def calculate_std_dev(amounts: list[float], mean: float) -> float:
    """Calculate the population standard deviation."""
    if len(amounts) <= 1:
        return 0.0
    variance = sum((a - mean) ** 2 for a in amounts) / len(amounts)
    return math.sqrt(variance)


def calculate_median(amounts: list[float]) -> float:
    """Calculate the median."""
    if not amounts:
        return 0.0
    return float(median(amounts))


def calculate_mad(amounts: list[float], med: float) -> float:
    """Calculate Median Absolute Deviation (MAD)."""
    if len(amounts) <= 1:
        return 0.0
    deviations = [abs(a - med) for a in amounts]
    return float(median(deviations))


def is_anomalous(amount: float, mean: float, std_dev: float) -> bool:
    """Check if an amount exceeds the mean + 2σ threshold."""
    threshold = mean + SIGMA_MULTIPLIER * std_dev
    return amount > threshold


def _generate_explanation(
    description: str,
    amount: float,
    category: str,
    typical: float,
) -> str:
    """Generate an explanation for a flagged anomaly."""
    if llm_client.is_available():
        try:
            ratio = amount / typical if typical > 0 else 0
            prompt = (
                f"Transaction: '{description}' for ${amount:.2f} in the '{category}' category. "
                f"The user's typical spending in this category is ${typical:.2f}. "
                f"This transaction is {ratio:.1f} times the typical amount. "
                f"Explain in one sentence why this is flagged as unusual."
            )
            return llm_client.chat(SYSTEM_PROMPT, prompt)
        except Exception as e:
            logger.error("Failed to generate LLM explanation: %s", e)

    # Fallback explanation
    return (
        f"This {description} transaction of ${amount:.2f} is significantly higher "
        f"than your typical spending of ${typical:.2f} in the {category} category."
    )


def detect_anomalies(transactions: list[dict]) -> list[dict]:
    """
    Detect anomalies across all transactions. Modifies dicts in-place,
    adding 'anomaly' (bool) and 'anomaly_explanation' (str) keys.

    Uses a dual-threshold approach:
      1. Median + 2 * MAD (robust to outliers)
      2. 3× the median (catches outliers in small datasets)

    A transaction is flagged if it exceeds EITHER threshold.
    Only considers expense transactions (positive amounts), skips Income.
    Returns the list of flagged transactions.
    """
    # Group by category (expenses only)
    by_category: dict[str, list[int]] = defaultdict(list)
    for i, tx in enumerate(transactions):
        cat = tx.get("category")
        if cat and cat != "Income" and tx.get("amount", 0) > 0:
            by_category[cat].append(i)

    flagged: list[dict] = []

    for category, indices in by_category.items():
        if len(indices) < MIN_TRANSACTIONS_FOR_DETECTION:
            logger.debug(
                "Skipping anomaly detection for '%s': only %d transaction(s)",
                category,
                len(indices),
            )
            continue

        amounts = [transactions[i]["amount"] for i in indices]
        med = calculate_median(amounts)
        mad = calculate_mad(amounts, med)

        # Dual threshold: robust MAD-based + simple multiplier
        mad_threshold = med + SIGMA_MULTIPLIER * mad * 1.4826  # 1.4826 scales MAD to match σ for normal distributions
        median_threshold = med * MEDIAN_MULTIPLIER
        threshold = min(mad_threshold, median_threshold)  # Use the tighter one

        logger.debug(
            "Category '%s': median=%.2f, mad=%.2f, mad_threshold=%.2f, median_threshold=%.2f, effective=%.2f",
            category,
            med,
            mad,
            mad_threshold,
            median_threshold,
            threshold,
        )

        for idx in indices:
            tx = transactions[idx]
            if tx["amount"] > threshold:
                tx["anomaly"] = True
                explanation = _generate_explanation(
                    tx["description"], tx["amount"], category, med
                )
                tx["anomaly_explanation"] = explanation
                flagged.append(tx)
                logger.info(
                    "Anomaly flagged: %s - $%.2f (threshold: $%.2f)",
                    tx["description"],
                    tx["amount"],
                    threshold,
                )

    return flagged
