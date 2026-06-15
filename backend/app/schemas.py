"""
Pydantic response schemas matching the frontend TypeScript interfaces exactly.

Frontend types:
  Transaction:     id, date, description, amount, category, anomaly, anomalyExplanation
  CategorySummary: category, totalAmount, transactionCount
  Anomaly:         transactionId, date, description, amount, category, explanation
  UploadResponse:  message, transactionCount, transactions[]
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TransactionSchema(BaseModel):
    """Matches frontend `Transaction` interface."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    description: str
    amount: float
    category: Optional[str] = None
    anomaly: bool = False
    # Map Python snake_case to frontend camelCase
    anomaly_explanation: Optional[str] = Field(default=None, alias="anomalyExplanation")

    def model_dump(self, **kwargs):
        """Override to always use camelCase keys for frontend compatibility."""
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class CategorySummarySchema(BaseModel):
    """Matches frontend `CategorySummary` interface."""

    category: str
    total_amount: float = Field(alias="totalAmount")
    transaction_count: int = Field(alias="transactionCount")

    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class AnomalySchema(BaseModel):
    """Matches frontend `Anomaly` interface."""

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
    """Matches frontend `UploadResponse` interface."""

    message: str
    transaction_count: int = Field(alias="transactionCount")
    transactions: list[TransactionSchema]

    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)


class MessageSchema(BaseModel):
    """Simple message response."""

    message: str
