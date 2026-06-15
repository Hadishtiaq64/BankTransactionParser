"""
Unit tests for the anomaly detection service.
Tests statistical calculations, threshold detection, and edge cases.
"""

from app.services.anomaly_detector import (
    calculate_mean,
    calculate_std_dev,
    detect_anomalies,
    is_anomalous,
)


class TestCalculateMean:
    def test_basic(self):
        assert calculate_mean([100, 200, 300]) == 200.0

    def test_empty(self):
        assert calculate_mean([]) == 0.0

    def test_single(self):
        assert calculate_mean([150.0]) == 150.0

    def test_floats(self):
        result = calculate_mean([10.5, 20.5, 30.5])
        assert abs(result - 20.5) < 0.01


class TestCalculateStdDev:
    def test_basic(self):
        # Population stddev of [10, 20, 30] = sqrt(200/3) ≈ 8.165
        std = calculate_std_dev([10, 20, 30], 20.0)
        assert 8.0 < std < 8.3

    def test_single(self):
        assert calculate_std_dev([100], 100.0) == 0.0

    def test_all_equal(self):
        assert calculate_std_dev([50, 50, 50], 50.0) == 0.0

    def test_high_variance(self):
        std = calculate_std_dev([1, 100], 50.5)
        assert std > 40  # High variance


class TestIsAnomalous:
    def test_below_threshold(self):
        # threshold = 50 + 2*10 = 70
        assert is_anomalous(60.0, 50.0, 10.0) is False

    def test_at_threshold(self):
        assert is_anomalous(70.0, 50.0, 10.0) is False

    def test_above_threshold(self):
        assert is_anomalous(71.0, 50.0, 10.0) is True

    def test_far_above_threshold(self):
        assert is_anomalous(500.0, 50.0, 10.0) is True

    def test_zero_stddev(self):
        # threshold = 50 + 0 = 50
        assert is_anomalous(50.0, 50.0, 0.0) is False
        assert is_anomalous(51.0, 50.0, 0.0) is True


class TestDetectAnomalies:
    def test_flags_outlier(self):
        transactions = [
            {"description": "Grocery A", "amount": 50.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Grocery B", "amount": 60.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Grocery C", "amount": 55.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Grocery D", "amount": 65.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "HUGE Grocery", "amount": 500.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
        ]

        flagged = detect_anomalies(transactions)

        assert len(flagged) == 1
        assert transactions[4]["anomaly"] is True
        assert transactions[4]["anomaly_explanation"] is not None

    def test_no_anomalies_when_similar(self):
        transactions = [
            {"description": "A", "amount": 48.0, "category": "Dining", "anomaly": False, "anomaly_explanation": None},
            {"description": "B", "amount": 52.0, "category": "Dining", "anomaly": False, "anomaly_explanation": None},
            {"description": "C", "amount": 50.0, "category": "Dining", "anomaly": False, "anomaly_explanation": None},
        ]

        flagged = detect_anomalies(transactions)

        assert len(flagged) == 0
        assert all(not tx["anomaly"] for tx in transactions)

    def test_skips_small_categories(self):
        transactions = [
            {"description": "Only one", "amount": 9999.0, "category": "Entertainment", "anomaly": False, "anomaly_explanation": None},
        ]

        flagged = detect_anomalies(transactions)

        assert len(flagged) == 0
        assert not transactions[0]["anomaly"]

    def test_skips_income(self):
        transactions = [
            {"description": "Payroll", "amount": -3250.0, "category": "Income", "anomaly": False, "anomaly_explanation": None},
            {"description": "Bonus", "amount": -5000.0, "category": "Income", "anomaly": False, "anomaly_explanation": None},
        ]

        flagged = detect_anomalies(transactions)

        assert len(flagged) == 0

    def test_skips_negative_amounts(self):
        """Negative amounts (even in non-Income categories) should not be flagged."""
        transactions = [
            {"description": "Refund A", "amount": -50.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Refund B", "amount": -30.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
        ]

        flagged = detect_anomalies(transactions)
        assert len(flagged) == 0

    def test_multiple_categories(self):
        transactions = [
            {"description": "Grocery 1", "amount": 50.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Grocery 2", "amount": 55.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Grocery 3", "amount": 500.0, "category": "Groceries", "anomaly": False, "anomaly_explanation": None},
            {"description": "Dining 1", "amount": 30.0, "category": "Dining", "anomaly": False, "anomaly_explanation": None},
            {"description": "Dining 2", "amount": 35.0, "category": "Dining", "anomaly": False, "anomaly_explanation": None},
            {"description": "Dining 3", "amount": 300.0, "category": "Dining", "anomaly": False, "anomaly_explanation": None},
        ]

        flagged = detect_anomalies(transactions)

        # Both the $500 grocery and $300 dining should be flagged
        assert len(flagged) == 2
        assert transactions[2]["anomaly"] is True
        assert transactions[5]["anomaly"] is True
