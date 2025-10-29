"""Data models for the unified billing and allowance system."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlanSharedMode(str, Enum):
    SHARED_POOL = "shared_pool"
    HYBRID = "hybrid"


class Plan(Base):
    """Subscription plan definition with BC/RC allowances."""

    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bc_monthly: Mapped[int] = mapped_column(Integer, nullable=False)
    rc_monthly: Mapped[int] = mapped_column(Integer, nullable=False)
    usage_bonus_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    trial_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    shared_mode: Mapped[PlanSharedMode] = mapped_column(SAEnum(PlanSharedMode, name="plan_shared_mode"), nullable=False)
    payg_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    price_usd: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    allowances: Mapped[List["Allowance"]] = relationship("Allowance", back_populates="plan")
    subscriptions: Mapped[List["UserSubscription"]] = relationship("UserSubscription", back_populates="plan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "bc_monthly": self.bc_monthly,
            "rc_monthly": self.rc_monthly,
            "usage_bonus_rate": float(self.usage_bonus_rate) if self.usage_bonus_rate is not None else None,
            "trial_days": self.trial_days,
            "shared_mode": self.shared_mode.value,
            "payg_enabled": self.payg_enabled,
            "price_usd": float(self.price_usd),
        }


class AllowanceType(str, Enum):
    BC = "BC"
    RC = "RC"
    USAGE = "Usage"


class AllowanceWindow(str, Enum):
    DAILY = "daily"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class RolloverPolicy(str, Enum):
    NONE = "none"
    ONE_CYCLE = "1_cycle"
    ANNUAL = "annual"


class Allowance(Base):
    """Represents a ledger of available credits for a user."""

    __tablename__ = "allowances"
    __table_args__ = (
        UniqueConstraint("user_id", "plan_id", "type", "source", name="uq_allowance_user_plan_type"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    type: Mapped[AllowanceType] = mapped_column(SAEnum(AllowanceType, name="allowance_type"), nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    window: Mapped[AllowanceWindow] = mapped_column(SAEnum(AllowanceWindow, name="allowance_window"), nullable=False)
    rollover_policy: Mapped[RolloverPolicy] = mapped_column(
        SAEnum(RolloverPolicy, name="allowance_rollover_policy"),
        nullable=False,
        default=RolloverPolicy.NONE,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    plan: Mapped[Optional[Plan]] = relationship("Plan", back_populates="allowances")
    user: Mapped["User"] = relationship("User", back_populates="allowances")
    rollover_buckets: Mapped[List["RolloverBucket"]] = relationship(
        "RolloverBucket",
        back_populates="allowance",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def available(self) -> int:
        rollover_total = sum(bucket.remain for bucket in self.rollover_buckets if bucket.remain > 0)
        return max(self.total - self.used, 0) + rollover_total


class RolloverBucket(Base):
    """Rollover credits that must be consumed before current-cycle allowance."""

    __tablename__ = "rollover_buckets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    allowance_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("allowances.id", ondelete="CASCADE"), nullable=False, index=True
    )
    remain: Mapped[int] = mapped_column(Integer, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    allowance: Mapped[Allowance] = relationship("Allowance", back_populates="rollover_buckets")
    user: Mapped["User"] = relationship("User", back_populates="rollover_buckets")


class SubscriptionStatus(str, Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class UserSubscription(Base):
    """Tracks user membership in subscription plans."""

    __tablename__ = "user_subscriptions"
    __table_args__ = (
        UniqueConstraint("user_id", "plan_id", name="uq_user_plan_membership"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus, name="subscription_status"), nullable=False, default=SubscriptionStatus.TRIALING
    )
    payg_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    current_period_start: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="subscriptions")
    plan: Mapped[Plan] = relationship("Plan", back_populates="subscriptions")


class ConsumptionEvent(Base):
    """Immutable ledger of consumption actions."""

    __tablename__ = "consumption_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    allowance_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("allowances.id", ondelete="SET NULL"), nullable=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    complexity_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    action_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    allowance: Mapped[Optional[Allowance]] = relationship("Allowance")
    user: Mapped["User"] = relationship("User", back_populates="consumption_events")


class UsageMeterReading(Base):
    """Raw usage signals ingested from infrastructure metrics."""

    __tablename__ = "usage_meter_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    metric: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Numeric(16, 4), nullable=False)
    period: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. 2025-09-21T10
    window_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    window_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="usage_meter_readings")


class UsageSummary(Base):
    """Aggregated usage bucketed by billing cycle."""

    __tablename__ = "usage_summaries"
    __table_args__ = (
        UniqueConstraint("workspace_id", "metric", "period", name="uq_usage_summary_period"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    period: Mapped[str] = mapped_column(String(32), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(16, 4), nullable=False)
    overage_amount: Mapped[Optional[float]] = mapped_column(Numeric(16, 4), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="usage_summaries")


class OverageChargeStatus(str, Enum):
    PENDING = "pending"
    INVOICED = "invoiced"
    PAID = "paid"
    WAIVED = "waived"


class OverageCharge(Base):
    """Represents pay-as-you-go billing items beyond allowances."""

    __tablename__ = "overage_charges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    workspace_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd")
    status: Mapped[OverageChargeStatus] = mapped_column(
        SAEnum(OverageChargeStatus, name="overage_charge_status"), nullable=False, default=OverageChargeStatus.PENDING
    )
    usage_summary_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("usage_summaries.id", ondelete="SET NULL"), nullable=True
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    invoiced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="overage_charges")
    usage_summary: Mapped[Optional[UsageSummary]] = relationship("UsageSummary")


class BudgetGuardBehavior(str, Enum):
    SUSPEND = "suspend"
    THROTTLE = "throttle"


class BudgetGuard(Base):
    """User-configurable spend guard rails."""

    __tablename__ = "budget_guards"
    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_budget_guard_workspace"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    monthly_cap: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    behavior: Mapped[BudgetGuardBehavior] = mapped_column(
        SAEnum(BudgetGuardBehavior, name="budget_guard_behavior"), nullable=False, default=BudgetGuardBehavior.THROTTLE
    )
    notify: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd")
    current_window_spend: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="budget_guards")


class AllowanceDailyAutofix(Base):
    """Tracks free auto-fix usage for the Free plan."""

    __tablename__ = "allowance_daily_autofix"
    __table_args__ = (
        UniqueConstraint("user_id", "date_key", name="uq_autofix_user_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date_key: Mapped[str] = mapped_column(String(16), nullable=False)  # YYYY-MM-DD
    consumed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    limit: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="autofix_counters")


class CostMetric(str, Enum):
    BC = "BC"
    RC = "RC"
    USAGE = "Usage"


class CostModel(Base):
    """Cost attribution formulas for BC/RC/Usage."""

    __tablename__ = "cost_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    metric: Mapped[CostMetric] = mapped_column(SAEnum(CostMetric, name="cost_metric"), nullable=False, unique=True)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    formula: Mapped[str] = mapped_column(Text, nullable=False)
    base_rate: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd")
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
