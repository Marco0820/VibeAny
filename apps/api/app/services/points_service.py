"""Service utilities bridging legacy point interfaces到新的 BillingService."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.billing import (
    Allowance,
    AllowanceType,
    AllowanceWindow,
    ConsumptionEvent,
    RolloverBucket,
    RolloverPolicy,
)
from app.models.point_transactions import PointTransaction, PointTransactionType
from app.models.users import User
from app.services.billing_service import BillingService, AllowanceExhaustedError, AutoFixLimitExceeded


class InsufficientPointsError(Exception):
    """Raised when a user attempts to spend more credits than available."""


RECHARGE_PACKAGES: List[Dict[str, object]] = [
    {
        "id": "starter",
        "name": "入门包",
        "description": "适合偶尔使用，快速体验 VibeAny 服务",
        "points": 500,
        "price": 49,
    },
    {
        "id": "creator",
        "name": "创作者包",
        "description": "适合常规构建与调试场景",
        "points": 1500,
        "price": 129,
    },
    {
        "id": "studio",
        "name": "工作室包",
        "description": "高频使用与团队协作的推荐套餐",
        "points": 4000,
        "price": 299,
    },
]

RECHARGE_PACKAGES_BY_ID = {pkg["id"]: pkg for pkg in RECHARGE_PACKAGES}


DEFAULT_USAGE_COSTS: Dict[str, int] = {
    "project_creation": 200,
    "act_execution": 25,
    "chat_message": 8,
}


class PointsService:
    """向后兼容的积分接口，实现基于 billing.allowances 的扣减逻辑。"""

    def __init__(self, db: Session):
        self.db = db
        self.billing = BillingService(db)

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------
    def get_packages(self) -> List[Dict[str, object]]:
        return RECHARGE_PACKAGES

    def get_usage_cost(self, action: str, default: int = 0) -> int:
        return DEFAULT_USAGE_COSTS.get(action, default)

    def ensure_balance(self, user: User, required: int) -> bool:
        available, _ = self.billing.would_consume(
            user,
            allowance_type=AllowanceType.BC,
            amount=max(required, 0),
        )
        return available >= required

    def recharge(self, user: User, package_id: str, *, description: Optional[str] = None) -> PointTransaction:
        package = RECHARGE_PACKAGES_BY_ID.get(package_id)
        if not package:
            raise ValueError("Unknown recharge package")

        desc = description or f"充值套餐：{package['name']}"
        allowance = self.billing.grant_allowance(
            user=user,
            plan=None,
            allowance_type=AllowanceType.BC,
            total=int(package["points"]),
            window=AllowanceWindow.MONTHLY,
            rollover_policy=RolloverPolicy.NONE,
            source=f"recharge::{package_id}::{uuid4()}",
            metadata={
                "type": "recharge",
                "package": package_id,
                "price": package["price"],
            },
        )
        self.db.commit()
        return self._record_transaction(
            user=user,
            change=int(package["points"]),
            tx_type=PointTransactionType.RECHARGE,
            description=desc,
            metadata={
                "allowance_id": allowance.id,
                "package": package_id,
                "price": package["price"],
            },
        )

    def consume(
        self,
        user: User,
        points: int,
        *,
        reason: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PointTransaction:
        if points <= 0:
            raise ValueError("Points to consume must be positive")
        try:
            result = self.billing.consume(
                user=user,
                allowance_type=AllowanceType.BC,
                amount=int(points),
                action=reason,
                metadata=metadata,
            )
        except AllowanceExhaustedError as exc:
            raise InsufficientPointsError(str(exc)) from exc
        except AutoFixLimitExceeded as exc:
            raise InsufficientPointsError(str(exc)) from exc

        desc = description or f"使用积分：{reason}"
        return self._record_transaction(
            user=user,
            change=-int(result.total_deducted),
            tx_type=PointTransactionType.USAGE,
            description=desc,
            metadata={
                **(metadata or {}),
                "consumption_event_id": result.event.id,
                "allowance_id": result.event.allowance_id,
                "payg_charge_id": result.payg_triggered.id if result.payg_triggered else None,
                "autofix": bool(result.autofix_grant),
            },
        )

    def get_summary(self, user: User) -> Dict[str, int]:
        balance = self._calculate_balance(user)
        total_earned = (
            self.db.query(func.coalesce(func.sum(PointTransaction.change), 0))
            .filter(PointTransaction.user_id == user.id, PointTransaction.change > 0)
            .scalar()
        )
        total_spent = (
            self.db.query(func.coalesce(func.sum(PointTransaction.change), 0))
            .filter(PointTransaction.user_id == user.id, PointTransaction.change < 0)
            .scalar()
        )
        return {
            "balance": int(balance),
            "lifetime_recharged": int(total_earned or 0),
            "lifetime_consumed": int(abs(total_spent or 0)),
        }

    def get_history(self, user: User, *, limit: int = 20, offset: int = 0) -> List[PointTransaction]:
        return (
            self.db.query(PointTransaction)
            .filter(PointTransaction.user_id == user.id)
            .order_by(PointTransaction.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _bc_allowances(self, user: User) -> List[Allowance]:
        return list(
            self.db.scalars(
                select(Allowance).where(
                    Allowance.user_id == user.id,
                    Allowance.type == AllowanceType.BC,
                    (
                        (Allowance.expires_at.is_(None))
                        | (Allowance.expires_at > datetime.utcnow())
                    ),
                )
            )
        )

    def _rollover_balance(self, user: User) -> int:
        return int(
            self.db.scalar(
                select(func.coalesce(func.sum(RolloverBucket.remain), 0))
                .join(Allowance, Allowance.id == RolloverBucket.allowance_id)
                .where(
                    RolloverBucket.user_id == user.id,
                    Allowance.type == AllowanceType.BC,
                    (
                        (RolloverBucket.expires_at.is_(None))
                        | (RolloverBucket.expires_at > datetime.utcnow())
                    ),
                )
            )
            or 0
        )

    def _calculate_balance(self, user: User) -> int:
        allowances = self._bc_allowances(user)
        allowance_balance = sum(max(allowance.total - allowance.used, 0) for allowance in allowances)
        return allowance_balance + self._rollover_balance(user)

    def _record_transaction(
        self,
        *,
        user: User,
        change: int,
        tx_type: PointTransactionType,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PointTransaction:
        balance_after = self._calculate_balance(user)
        transaction = PointTransaction(
            id=str(uuid4()),
            user_id=user.id,
            type=tx_type,
            change=change,
            description=description,
            balance_after=balance_after,
            metadata_json=metadata or {},
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction
