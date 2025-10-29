"""Models for tracking user point transactions in VibeAny."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PointTransactionType(str, Enum):
    """Enumerates the different types of point transactions."""

    RECHARGE = "recharge"
    USAGE = "usage"
    ADJUSTMENT = "adjustment"
    REFUND = "refund"


class PointTransaction(Base):
    """Represents a single change to a user's point balance."""

    __tablename__ = "point_transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[PointTransactionType] = mapped_column(
        SAEnum(PointTransactionType, name="point_transaction_type"), nullable=False
    )
    change: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="point_transactions")

    def to_dict(self) -> dict:
        """Return a serialisable dictionary representation."""

        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type.value,
            "change": self.change,
            "description": self.description,
            "balance_after": self.balance_after,
            "metadata": self.metadata_json or {},
            "created_at": self.created_at.isoformat(),
        }
