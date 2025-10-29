"""User model for VibeAny authentication."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, DateTime, Integer, JSON, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """Represents an authenticated VibeAny user."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_user_provider"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    point_transactions: Mapped[List["PointTransaction"]] = relationship(
        "PointTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    payments: Mapped[List["Payment"]] = relationship(
        "Payment",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    subscriptions: Mapped[List["UserSubscription"]] = relationship(
        "UserSubscription",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    allowances: Mapped[List["Allowance"]] = relationship(
        "Allowance",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    rollover_buckets: Mapped[List["RolloverBucket"]] = relationship(
        "RolloverBucket",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    consumption_events: Mapped[List["ConsumptionEvent"]] = relationship(
        "ConsumptionEvent",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    usage_meter_readings: Mapped[List["UsageMeterReading"]] = relationship(
        "UsageMeterReading",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    usage_summaries: Mapped[List["UsageSummary"]] = relationship(
        "UsageSummary",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    overage_charges: Mapped[List["OverageCharge"]] = relationship(
        "OverageCharge",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    budget_guards: Mapped[List["BudgetGuard"]] = relationship(
        "BudgetGuard",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    autofix_counters: Mapped[List["AllowanceDailyAutofix"]] = relationship(
        "AllowanceDailyAutofix",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    providers: Mapped[List["UserProvider"]] = relationship(
        "UserProvider",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<User id={self.id} provider={self.provider} email={self.email}>"
