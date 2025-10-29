"""Models for tracking payment records across providers."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PaymentProvider(str, Enum):
    """Supported external payment providers."""

    STRIPE = "stripe"
    PAYPAL = "paypal"
    CREEM = "creem"


class PaymentStatus(str, Enum):
    """Lifecycle status of a payment."""

    CREATED = "created"
    REQUIRES_ACTION = "requires_action"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class Payment(Base):
    """Persistent payment record for crediting user points."""

    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("provider", "provider_payment_id", name="uq_payment_provider_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[PaymentProvider] = mapped_column(
        SAEnum(PaymentProvider, name="payment_provider"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="payment_status"), default=PaymentStatus.CREATED, nullable=False
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Amount in smallest currency unit
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="usd")
    package_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    provider_payment_id: Mapped[str] = mapped_column(String(128), nullable=False)
    provider_customer_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    provider_receipt_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    raw_provider_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    point_transaction_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="payments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider.value,
            "status": self.status.value,
            "amount": self.amount,
            "currency": self.currency,
            "package_id": self.package_id,
            "points": self.points,
            "provider_payment_id": self.provider_payment_id,
            "provider_customer_id": self.provider_customer_id,
            "point_transaction_id": self.point_transaction_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }
