"""
SQLAlchemy ORM model for bank transactions.
"""

from sqlalchemy import Boolean, Column, Date, Float, Integer, String

from .database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=True)
    anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_explanation = Column(String(1000), nullable=True)
