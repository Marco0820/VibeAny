"""Billing API endpoints covering plans, migrations, usage, and allowances."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user, get_db
from app.models.billing import Allowance, OverageCharge, Plan, UsageMeterReading, UsageSummary, UserSubscription
from app.models.users import User
from app.services.billing_service import BillingService
from app.services.usage_service import UsageRecordResult, UsageService


router = APIRouter(tags=["billing"])


class PlanResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    bc_monthly: int
    rc_monthly: int
    usage_bonus_rate: float | None = None
    trial_days: int
    shared_mode: str
    payg_enabled: bool
    price_usd: float

    @classmethod
    def from_model(cls, plan: Plan) -> "PlanResponse":
        data = plan.to_dict()
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description"),
            bc_monthly=data["bc_monthly"],
            rc_monthly=data["rc_monthly"],
            usage_bonus_rate=data.get("usage_bonus_rate"),
            trial_days=data["trial_days"],
            shared_mode=data["shared_mode"],
            payg_enabled=data["payg_enabled"],
            price_usd=data["price_usd"],
        )


class MigratePlanRequest(BaseModel):
    user_id: str = Field(..., description="Target user ID to migrate")
    old_plan: str = Field(..., description="Legacy plan identifier for audit")
    new_plan: str = Field(..., description="New plan name or UUID to activate")


class SubscriptionResponse(BaseModel):
    id: str
    plan_id: str
    status: str
    payg_enabled: bool
    current_period_start: str
    current_period_end: str | None
    trial_ends_at: str | None

    @classmethod
    def from_model(cls, sub: UserSubscription) -> "SubscriptionResponse":
        return cls(
            id=sub.id,
            plan_id=sub.plan_id,
            status=sub.status.value,
            payg_enabled=sub.payg_enabled,
            current_period_start=sub.current_period_start.isoformat(),
            current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
            trial_ends_at=sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        )


class AllowanceResponse(BaseModel):
    id: str
    plan_id: str | None
    type: str
    total: int
    used: int
    window: str
    rollover_policy: str
    expires_at: str | None

    @classmethod
    def from_model(cls, allowance: Allowance) -> "AllowanceResponse":
        return cls(
            id=allowance.id,
            plan_id=allowance.plan_id,
            type=allowance.type.value,
            total=allowance.total,
            used=allowance.used,
            window=allowance.window.value,
            rollover_policy=allowance.rollover_policy.value,
            expires_at=allowance.expires_at.isoformat() if allowance.expires_at else None,
        )


class UsageReportRequest(BaseModel):
    workspace_id: str = Field(..., description="Workspace or project identifier")
    metric: str = Field(..., description="Usage metric name, e.g. bandwidth/api_requests")
    value: float = Field(..., ge=0, description="Measured value for the window")
    period: Optional[str] = Field(None, description="Period grouping key, defaults to derived hour key")
    window_start: Optional[datetime] = Field(None, description="Window start ISO timestamp")
    window_end: Optional[datetime] = Field(None, description="Window end ISO timestamp")
    metadata: Optional[dict] = None
    consume_allowance: bool = Field(default=True, description="Whether to deduct usage allowances")


class UsageReadingResponse(BaseModel):
    id: str
    workspace_id: str
    metric: str
    value: float
    period: str
    window_start: datetime
    window_end: datetime

    @classmethod
    def from_model(cls, reading: UsageMeterReading) -> "UsageReadingResponse":
        return cls(
            id=reading.id,
            workspace_id=reading.workspace_id,
            metric=reading.metric,
            value=float(reading.value),
            period=reading.period,
            window_start=reading.window_start,
            window_end=reading.window_end,
        )


class UsageSummaryResponse(BaseModel):
    id: str
    workspace_id: str
    metric: str
    period: str
    value: float
    overage_amount: float | None
    currency: str

    @classmethod
    def from_model(cls, summary: UsageSummary) -> "UsageSummaryResponse":
        return cls(
            id=summary.id,
            workspace_id=summary.workspace_id,
            metric=summary.metric,
            period=summary.period,
            value=float(summary.value or 0),
            overage_amount=float(summary.overage_amount) if summary.overage_amount is not None else None,
            currency=summary.currency,
        )


class ConsumptionEventResponse(BaseModel):
    event_id: str
    allowance_id: str | None
    allowance_type: str
    amount: int
    payg_charge_id: str | None
    autofix: bool

    @classmethod
    def from_consumption(cls, consumption: UsageRecordResult | None) -> "ConsumptionEventResponse":
        if consumption is None or consumption.consumption is None:
            raise ValueError("Consumption result required")
        result = consumption.consumption
        return cls(
            event_id=result.event.id,
            allowance_id=result.event.allowance_id,
            allowance_type=result.event.metadata_json.get("allowance_type", "Usage")
            if result.event.metadata_json
            else "Usage",
            amount=result.total_deducted,
            payg_charge_id=result.payg_triggered.id if result.payg_triggered else None,
            autofix=bool(result.autofix_grant),
        )


class UsageReportResponse(BaseModel):
    reading: UsageReadingResponse
    summary: UsageSummaryResponse
    consumption: ConsumptionEventResponse | None


class OverageResponse(BaseModel):
    id: str
    metric: str
    amount: float
    currency: str
    status: str
    generated_at: datetime
    invoiced_at: datetime | None

    @classmethod
    def from_model(cls, overage: OverageCharge) -> "OverageResponse":
        return cls(
            id=overage.id,
            metric=overage.metric,
            amount=float(overage.amount),
            currency=overage.currency,
            status=overage.status.value,
            generated_at=overage.generated_at,
            invoiced_at=overage.invoiced_at,
        )


@router.get("/api/billing/plans", response_model=List[PlanResponse])
def list_plans(
    db: Session = Depends(get_db),
    _: Optional[User] = Depends(get_optional_user),
):
    """Return all active plans, seeding defaults if missing."""
    service = BillingService(db)
    service.ensure_default_plans()
    plans = db.scalars(select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.price_usd.asc())).all()
    return [PlanResponse.from_model(plan) for plan in plans]


@router.post("/api/billing/migrate")
def migrate_plan(
    payload: MigratePlanRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Migrate a user from a legacy plan to the new unified plan baseline."""
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    service = BillingService(db)
    service.ensure_default_plans()
    plan = db.scalar(
        select(Plan).where((Plan.id == payload.new_plan) | (Plan.name == payload.new_plan)).limit(1)
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Target plan not found")

    subscription = service.activate_plan(user, plan, source="migration")
    db.commit()
    db.refresh(subscription)

    allowances = db.scalars(
        select(Allowance).where(Allowance.user_id == user.id, Allowance.plan_id == plan.id)
    ).all()

    return {
        "subscription": SubscriptionResponse.from_model(subscription),
        "allowances": [AllowanceResponse.from_model(item) for item in allowances],
        "plan": PlanResponse.from_model(plan),
        "notes": {"old_plan": payload.old_plan},
    }


@router.post("/api/billing/usage", response_model=UsageReportResponse)
def record_usage(
    payload: UsageReportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = UsageService(db)
    window_start, window_end, period = _resolve_usage_window(payload)

    result = service.record_usage(
        user=user,
        workspace_id=payload.workspace_id,
        metric=payload.metric,
        value=payload.value,
        period=period,
        window_start=window_start,
        window_end=window_end,
        metadata=payload.metadata,
        consume_allowance=payload.consume_allowance,
    )

    return UsageReportResponse(
        reading=UsageReadingResponse.from_model(result.reading),
        summary=UsageSummaryResponse.from_model(result.summary),
        consumption=ConsumptionEventResponse.from_consumption(result) if result.consumption else None,
    )


@router.get("/api/billing/usage", response_model=List[UsageSummaryResponse])
def list_usage(
    workspace_id: Optional[str] = None,
    metric: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = UsageService(db)
    summaries = service.list_usage(user=user, workspace_id=workspace_id, metric=metric)
    return [UsageSummaryResponse.from_model(item) for item in summaries]


@router.get("/api/billing/overages", response_model=List[OverageResponse])
def list_overages(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = UsageService(db)
    overages = service.list_overages(user)
    return [OverageResponse.from_model(item) for item in overages]


def _resolve_usage_window(payload: UsageReportRequest) -> tuple[datetime, datetime, str]:
    if payload.window_start:
        start = payload.window_start
    elif payload.period:
        try:
            start = datetime.fromisoformat(payload.period)
        except ValueError:
            start = datetime.utcnow()
    else:
        start = datetime.utcnow()

    if payload.window_end:
        end = payload.window_end
    else:
        end = start + timedelta(hours=1)

    period = payload.period or start.strftime("%Y-%m-%dT%H")
    return start, end, period
