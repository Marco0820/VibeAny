"""Usage metering service to ingest and aggregate PAYG signals."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.billing import AllowanceType, OverageCharge, UsageMeterReading, UsageSummary
from app.models.users import User
from app.services.billing_service import BillingService, ConsumptionResult


@dataclass
class UsageRecordResult:
    reading: UsageMeterReading
    summary: UsageSummary
    consumption: Optional[ConsumptionResult]


class UsageService:
    """Coordinates usage ingestion with allowance consumption and summaries."""

    def __init__(self, db: Session):
        self.db = db
        self.billing = BillingService(db)

    def record_usage(
        self,
        *,
        user: User,
        workspace_id: str,
        metric: str,
        value: float,
        period: str,
        window_start: datetime,
        window_end: datetime,
        metadata: Optional[dict] = None,
        consume_allowance: bool = True,
    ) -> UsageRecordResult:
        value_decimal = Decimal(str(value))
        reading = UsageMeterReading(
            id=str(uuid4()),
            user_id=user.id,
            workspace_id=workspace_id,
            metric=metric,
            value=value_decimal,
            period=period,
            window_start=window_start,
            window_end=window_end,
            metadata_json=metadata or {},
        )
        self.db.add(reading)

        summary = self._upsert_summary(
            user_id=user.id,
            workspace_id=workspace_id,
            metric=metric,
            period=period,
            increment=value_decimal,
            metadata=metadata,
        )

        self.db.flush()

        consumption_result: Optional[ConsumptionResult] = None
        if consume_allowance:
            amount = max(int(round(float(value_decimal))), 0)
            if amount > 0:
                consumption_result = self.billing.consume(
                    user=user,
                    allowance_type=AllowanceType.USAGE,
                    amount=amount,
                    action=f"usage:{metric}",
                    metadata={"workspace_id": workspace_id, "period": period, "raw_value": value},
                    complexity_score=0,
                )

        self.db.refresh(reading)
        self.db.refresh(summary)

        return UsageRecordResult(reading=reading, summary=summary, consumption=consumption_result)

    def _upsert_summary(
        self,
        *,
        user_id: str,
        workspace_id: str,
        metric: str,
        period: str,
        increment: Decimal,
        metadata: Optional[dict],
    ) -> UsageSummary:
        summary = self.db.scalar(
            select(UsageSummary).where(
                UsageSummary.workspace_id == workspace_id,
                UsageSummary.metric == metric,
                UsageSummary.period == period,
            )
        )
        if summary is None:
            summary = UsageSummary(
                id=str(uuid4()),
                user_id=user_id,
                workspace_id=workspace_id,
                metric=metric,
                period=period,
                value=increment,
                metadata_json=metadata or {},
            )
        else:
            current = Decimal(str(summary.value or 0))
            summary.value = current + increment
            summary.metadata_json = (summary.metadata_json or {}) | (metadata or {})
        self.db.add(summary)
        return summary

    def list_usage(
        self,
        *,
        user: User,
        workspace_id: Optional[str] = None,
        metric: Optional[str] = None,
    ) -> List[UsageSummary]:
        stmt = select(UsageSummary).where(UsageSummary.user_id == user.id).order_by(UsageSummary.created_at.desc())
        if workspace_id:
            stmt = stmt.where(UsageSummary.workspace_id == workspace_id)
        if metric:
            stmt = stmt.where(UsageSummary.metric == metric)
        return self.db.scalars(stmt).all()

    def list_overages(self, user: User) -> List[OverageCharge]:
        stmt = select(OverageCharge).where(OverageCharge.user_id == user.id).order_by(OverageCharge.generated_at.desc())
        return self.db.scalars(stmt).all()
