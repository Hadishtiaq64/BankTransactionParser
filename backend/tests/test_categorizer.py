"""
Unit tests for the categorization service.
Tests keyword-based fallback categorization for all 8 categories.
"""

from app.services.categorizer import categorize_by_keyword, categorize_transactions


class TestCategorizeByKeyword:
    """Tests for keyword-based categorization."""

    def test_groceries(self):
        assert categorize_by_keyword("LOBLAWS #1042 TORONTO ON") == "Groceries"
        assert categorize_by_keyword("NO FRILLS #7801") == "Groceries"
        assert categorize_by_keyword("METRO GROCERY STORE #22") == "Groceries"
        assert categorize_by_keyword("SOBEYS #340 SCARBOROUGH") == "Groceries"
        assert categorize_by_keyword("WHOLE FOODS MARKET #10042") == "Groceries"
        assert categorize_by_keyword("COSTCO WHOLESALE #478") == "Groceries"

    def test_dining(self):
        assert categorize_by_keyword("TIM HORTONS #8821") == "Dining"
        assert categorize_by_keyword("MCDONALDS #14203") == "Dining"
        assert categorize_by_keyword("SWISS CHALET #112") == "Dining"
        assert categorize_by_keyword("UBER EATS *ORDER") == "Dining"
        assert categorize_by_keyword("SKIP THE DISHES *ORDER") == "Dining"

    def test_transport(self):
        assert categorize_by_keyword("PRESTO FARE PAYMENT") == "Transport"
        assert categorize_by_keyword("UBER *TRIP HELP") == "Transport"
        assert categorize_by_keyword("PETRO-CANADA #6612") == "Transport"
        assert categorize_by_keyword("SHELL STATION #445 TORONTO") == "Transport"

    def test_subscriptions(self):
        assert categorize_by_keyword("NETFLIX.COM") == "Subscriptions"
        assert categorize_by_keyword("SPOTIFY PREMIUM") == "Subscriptions"
        assert categorize_by_keyword("APPLE.COM/BILL") == "Subscriptions"
        assert categorize_by_keyword("AMAZON PRIME MEMBERSHIP") == "Subscriptions"
        assert categorize_by_keyword("XBOX GAME PASS") == "Subscriptions"

    def test_utilities(self):
        assert categorize_by_keyword("TORONTO HYDRO ELECTRIC") == "Utilities"
        assert categorize_by_keyword("ENBRIDGE GAS DISTRIBUTION") == "Utilities"
        assert categorize_by_keyword("ROGERS WIRELESS") == "Utilities"
        assert categorize_by_keyword("BELL MOBILITY") == "Utilities"

    def test_entertainment(self):
        assert categorize_by_keyword("CINEPLEX ODEON YONGE") == "Entertainment"
        assert categorize_by_keyword("STEAM PURCHASE") == "Entertainment"

    def test_income(self):
        assert categorize_by_keyword("PAYROLL DEPOSIT - CIBC") == "Income"
        assert categorize_by_keyword("INTERAC E-TRANSFER RECEIVED") == "Income"

    def test_other(self):
        assert categorize_by_keyword("RANDOM STORE XYZ") == "Other"
        assert categorize_by_keyword("UNKNOWN MERCHANT #123") == "Other"
        assert categorize_by_keyword("CANADIAN TIRE #083") == "Other"

    def test_case_insensitive(self):
        assert categorize_by_keyword("loblaws #1042 toronto on") == "Groceries"
        assert categorize_by_keyword("tim hortons #8821") == "Dining"
        assert categorize_by_keyword("netflix.com") == "Subscriptions"


class TestCategorizeTransactions:
    """Tests for the full categorize_transactions function."""

    def test_negative_amounts_are_income(self):
        transactions = [
            {"description": "PAYROLL DEPOSIT", "amount": -3250.00},
            {"description": "RANDOM STORE", "amount": -100.00},
        ]
        categorize_transactions(transactions)
        assert transactions[0]["category"] == "Income"
        assert transactions[1]["category"] == "Income"

    def test_mixed_transactions(self):
        transactions = [
            {"description": "LOBLAWS #1042", "amount": 67.42},
            {"description": "PAYROLL DEPOSIT", "amount": -3250.00},
            {"description": "NETFLIX.COM", "amount": 16.99},
            {"description": "UNKNOWN PLACE", "amount": 25.00},
        ]
        categorize_transactions(transactions)
        assert transactions[0]["category"] == "Groceries"
        assert transactions[1]["category"] == "Income"
        assert transactions[2]["category"] == "Subscriptions"
        assert transactions[3]["category"] == "Other"

    def test_preserves_existing_categories(self):
        transactions = [
            {"description": "LOBLAWS", "amount": 50.00, "category": "Custom"},
        ]
        categorize_transactions(transactions)
        # Should not overwrite existing category
        assert transactions[0]["category"] == "Custom"
