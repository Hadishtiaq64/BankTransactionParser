"""
CSV parser for bank transaction files.
Expects columns: date, description, amount (header row is skipped).
"""

import csv
import io
import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

DATE_FORMATS = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%m/%d/%y",  # 6/12/26
    "%Y/%m/%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%b %d, %Y",  # Jun 09, 2026
    "%B %d, %Y",  # June 09, 2026
    "%d %b %Y",   # 09 Jun 2026
]

# Labels that show up in bank "detail" exports but are never merchant names.
_VERTICAL_LABELS = {
    "account overview",
    "transaction details",
    "transaction detail",
    "transaction date",
    "posted on",
    "posted date",
    "date posted",
    "from account",
    "to account",
    "balance",
    "description",
    "amount",
    "date",
    "status",
    "type",
    "category",
    "details",
}

def parse_date(date_str: str) -> date:
    """Try multiple date formats and return the first match."""
    cleaned = date_str.strip().split("T")[0]  # Handle ISO 8601 timestamps
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date: '{date_str}'")

def parse_csv(content: str) -> list[dict]:
    """
    Heuristic CSV parser.

    First tries a row-based scan (one transaction per line, the common case).
    If that finds nothing, falls back to a "vertical" parser that handles
    single-transaction detail exports (e.g. TD EasyWeb) where the date,
    description, and amount are spread across separate lines.
    """
    rows = list(csv.reader(io.StringIO(content)))

    transactions = _parse_rows(rows)

    if not transactions:
        logger.info("Row-based parse found nothing; trying vertical/detail format")
        transactions = _parse_vertical(rows)

    if not transactions:
        raise ValueError(
            "No valid transactions found. Make sure your file contains dates and amounts."
        )

    logger.info("Parsed %d transactions from CSV", len(transactions))
    return transactions


def _parse_rows(rows: list[list[str]]) -> list[dict]:
    """Row-based parser: assumes each row is one transaction (date, desc, amount)."""
    transactions = []

    for line_num, row in enumerate(rows, start=1):
        if not row:
            continue

        logger.info("Line %d: raw row = %r", line_num, row)

        tx_date = None
        date_idx = -1
        
        # 1. Find the date
        for i, cell in enumerate(row):
            if not cell.strip():
                continue
            try:
                tx_date = parse_date(cell)
                date_idx = i
                break
            except ValueError:
                pass

        if not tx_date:
            logger.info("Line %d: no date found, skipping", line_num)
            continue  # Not a transaction row

        # 2. Find amounts (Debit/Credit/Balance)
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
            logger.warning("Line %d: Found date but no amount", line_num)
            continue

        # Logic for amount:
        # If there's 1 float -> that's the amount.
        # If there's 2 floats -> Debit, Credit OR Amount, Balance.
        # If there's 3 floats -> Debit, Credit, Balance.
        # Bank CSVs usually have Expenses (Debit) and Income (Credit).
        # We will assume the FIRST float we encounter is the transaction amount.
        # If it's a 3-column TD/CIBC format (Debit, Credit, Balance), 
        # an empty Debit means it's a Credit.
        amount = 0.0
        amount_idx = -1
        
        # Check if this looks like a CIBC/TD Debit/Credit row
        # Usually Debit is col 2, Credit is col 3.
        # We'll just look at the first two floats. 
        # If the first float is in a column, and it's positive, it's an expense.
        # If the bank separates them, usually Debit is first.
        # Let's just take the first non-zero float. If it's a deposit (credit),
        # we'll make it negative to match our system's "Income = negative" logic.
        first_float_idx, first_float_val = floats[0]
        
        # Heuristic: if we found 2 or 3 floats, and the first float is at index > 2, 
        # and there was an empty column before it, it might be a credit.
        # Let's simplify: just use the first float. If the user's bank has Deposits
        # in a specific column, they might come out as positive.
        # Actually, let's just use the first non-zero float. If it was preceded by an empty column 
        # that could have been a float, assume it's a credit (negative).
        amount = first_float_val
        amount_idx = first_float_idx
        
        # If the CSV has columns like: Date, Desc, Withdrawals, Deposits
        # And this row is: Date, Desc, "", "3250.00"
        # The first float is 3250.00. But it's in the Deposits column.
        # If `amount_idx` is > (date_idx + 1) and `row[amount_idx - 1]` is empty,
        # it's likely a Deposit. We negate it so it's treated as Income.
        if amount > 0 and amount_idx > 0 and not row[amount_idx - 1].strip():
             # Previous cell is empty, likely a credit column
             amount = -amount

        # 3. Find description
        # It's usually the longest remaining string, or the cell immediately after the date.
        remaining_strings = []
        for i, cell in enumerate(row):
            if i != date_idx and i != amount_idx and cell.strip():
                # Avoid taking numbers as descriptions if possible
                try:
                    float(cell.strip().replace('$', '').replace(',', ''))
                except ValueError:
                    remaining_strings.append(cell.strip())
        
        if remaining_strings:
            # Prefer the string that comes right after the date if it exists
            if date_idx + 1 < len(row) and row[date_idx + 1].strip() in remaining_strings:
                description = row[date_idx + 1].strip()
            else:
                description = max(remaining_strings, key=len)
        else:
            description = "Unknown Transaction"

        transactions.append({
            "date": tx_date,
            "description": description[:500],
            "amount": amount,
        })

    return transactions


def _amount_from_cell(cell: str):
    """Return a float if the cell looks like a money amount, else None.

    Requires a '$' or a decimal point so we don't mistake account numbers,
    years, or postal codes for amounts.
    """
    raw = cell.strip()
    if "$" not in raw and "." not in raw:
        return None
    cleaned = raw.replace("$", "").replace(",", "").strip()
    # Handle parenthesised negatives like (8.45)
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    cleaned = cleaned.strip("()")
    try:
        val = float(cleaned)
    except ValueError:
        return None
    return -val if negative else val


def _parse_vertical(rows: list[list[str]]) -> list[dict]:
    """Parse "detail" exports where one transaction spans multiple lines.

    Example (TD EasyWeb):
        "6/12/26, 3:49 AM",Account Overview
        Transaction Details
        TIM HORTONS #12 _F
        $8.45
        Transaction date,"Jun 9, 2026"

    Strategy: scan every cell in order. Collect candidate amounts and
    merchant-like descriptions, and pull the date from the "Transaction date"
    (preferred) or "Posted on" label. Each amount becomes one transaction,
    paired with the nearest preceding description.
    """
    tx_date = None
    posted_date = None

    # 1. Find the transaction date from labelled rows.
    for row in rows:
        for i, cell in enumerate(row):
            low = cell.strip().lower()
            if low == "transaction date":
                for nxt in row[i + 1:]:
                    try:
                        tx_date = parse_date(nxt)
                        break
                    except ValueError:
                        continue
            elif low in ("posted on", "posted date", "date posted"):
                for nxt in row[i + 1:]:
                    try:
                        posted_date = parse_date(nxt)
                        break
                    except ValueError:
                        continue

    final_date = tx_date or posted_date

    # 2. Walk all cells in order, collecting amounts and descriptions.
    amounts: list[tuple[int, float]] = []
    descriptions: list[tuple[int, str]] = []
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
            if c.startswith("*"):  # masked account numbers
                continue
            if "am" in low.split() or "pm" in low.split() or "am," in low or "pm," in low:
                continue  # export-header timestamp like "6/12/26, 3:49 AM"
            try:
                parse_date(c)
                continue  # it's a date, not a description
            except ValueError:
                pass
            if not any(ch.isalpha() for ch in c):
                continue  # must contain letters to be a merchant name

            descriptions.append((order, c))

    if not amounts:
        return []

    # 3. Pair each amount with the nearest preceding description.
    if final_date is None:
        # No labelled date found — fall back to any parseable date in the file.
        for row in rows:
            for cell in row:
                try:
                    final_date = parse_date(cell.split(",")[0])
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
        transactions.append({
            "date": final_date,
            "description": desc[:500],
            "amount": amt_val,
        })

    return transactions
