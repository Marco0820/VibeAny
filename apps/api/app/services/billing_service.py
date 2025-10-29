"""Core billing orchestration service for plans, allowances, and consumption."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Iterable, Optional, Tuple
from uuid import uuid4

from sqlalchemy import delete, func, select, or_
from sqlalchemy.orm import Session

from app.core.billing_config import BillingConfig, get_billing_config
from app.models.billing import (
    Allowance,
    AllowanceDailyAutofix,
    AllowanceType,
    AllowanceWindow,
    BudgetGuard,
    BudgetGuardBehavior,
    ConsumptionEvent,
    OverageCharge,
    OverageChargeStatus,
    Plan,
    PlanSharedMode,
    RolloverBucket,
    RolloverPolicy,
    SubscriptionStatus,
    UserSubscription,
)
from app.models.users import User


class BillingError(Exception):
    """Base error for billing operations."""


class AllowanceNotFoundError(BillingError):
    """Raised when no matching allowance can be located."""


class AllowanceExhaustedError(BillingError):
    """Raised when requested consumption exceeds allowance availability."""


class AutoFixLimitExceeded(BillingError):
    """Raised when the free auto-fix quota is exhausted for the day."""


class PaygChargeRequired(BillingError):
    """Raised when a PAYG charge should be created to satisfy consumption."""

    def __init__(self, allowance_type: AllowanceType, amount: int):
        super().__init__(f"PAYG required for {allowance_type.value}: {amount}")
        self.allowance_type = allowance_type
        self.amount = amount


@dataclass(frozen=True)
class ConsumptionResult:
    event: ConsumptionEvent
    total_deducted: int
    payg_triggered: Optional[OverageCharge] = None
    autofix_grant: Optional[AllowanceDailyAutofix] = None


@dataclass(frozen=True)
class PlanSeed:
    id: str
    name: str
    description: str
    bc_monthly: int
    rc_monthly: int
    price_usd: float
    trial_days: int
    shared_mode: PlanSharedMode
    payg_enabled: bool = True
    usage_bonus_rate: float = 0.2


DEFAULT_PLAN_SEEDS = [
    PlanSeed(
        id="11111111-1111-1111-1111-111111111111",
        name="Free",
        description="Starter tier with Auto-fix allowances and PAYG guard rails.",
        bc_monthly=0,
        rc_monthly=0,
        price_usd=0.0,
        trial_days=0,
        shared_mode=PlanSharedMode.SHARED_POOL,
        payg_enabled=True,
        usage_bonus_rate=0.2,
    ),
    PlanSeed(
        id="22222222-2222-2222-2222-222222222222",
        name="Pro",
        description="Core plan for growing teams with balanced BC/RC usage.",
        bc_monthly=400,
        rc_monthly=6000,
        price_usd=89.0,
        trial_days=1,
        shared_mode=PlanSharedMode.SHARED_POOL,
        payg_enabled=True,
        usage_bonus_rate=0.2,
    ),
    PlanSeed(
        id="33333333-3333-3333-3333-333333333333",
        name="Scale",
        description="High-throughput tier with extended Usage allowance.",
        bc_monthly=1000,
        rc_monthly=12000,
        price_usd=225.0,
        trial_days=1,
        shared_mode=PlanSharedMode.HYBRID,
        payg_enabled=True,
        usage_bonus_rate=0.2,
    ),
    PlanSeed(
        id="44444444-4444-4444-4444-444444444444",
        name="Enterprise",
        description="Custom contracts with dedicated account management.",
        bc_monthly=2500,
        rc_monthly=36000,
        price_usd=0.0,
        trial_days=0,
        shared_mode=PlanSharedMode.HYBRID,
        payg_enabled=True,
        usage_bonus_rate=0.2,
    ),
]


class BillingService:
    """High-level entry point for billing orchestration."""

    def __init__(self, db: Session, config: Optional[BillingConfig] = None):
        self.db = db
        self.config = config or get_billing_config()

    # ------------------------------------------------------------------
    # Subscription helpers
    # ------------------------------------------------------------------
    def get_primary_subscription(self, user: User) -> Optional[UserSubscription]:
        stmt = (
            select(UserSubscription)
            .where(
                UserSubscription.user_id == user.id,
                UserSubscription.is_primary.is_(True),
                UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
            )
            .order_by(UserSubscription.created_at.desc())
        )
        return self.db.scalars(stmt).first()

    # ------------------------------------------------------------------
    # Allowance lifecycle
    # ------------------------------------------------------------------
    def ensure_default_plans(self) -> list[Plan]:
        """Idempotently seed baseline plans required by the PRD."""
        plans: list[Plan] = []
        for seed in DEFAULT_PLAN_SEEDS:
            plan = self.db.get(Plan, seed.id)
            if plan is None:
                plan = Plan(
                    id=seed.id,
                    name=seed.name,
                    description=seed.description,
                    bc_monthly=seed.bc_monthly,
                    rc_monthly=seed.rc_monthly,
                    usage_bonus_rate=seed.usage_bonus_rate,
                    trial_days=seed.trial_days,
                    shared_mode=seed.shared_mode,
                    payg_enabled=seed.payg_enabled,
                    price_usd=Decimal(str(seed.price_usd)),
                )
            else:
                plan.name = seed.name
                plan.description = seed.description
                plan.bc_monthly = seed.bc_monthly
                plan.rc_monthly = seed.rc_monthly
                plan.usage_bonus_rate = seed.usage_bonus_rate
                plan.trial_days = seed.trial_days
                plan.shared_mode = seed.shared_mode
                plan.payg_enabled = seed.payg_enabled
                plan.price_usd = Decimal(str(seed.price_usd))
                plan.is_active = True
            self.db.add(plan)
            plans.append(plan)
        self.db.flush()
        return plans

    def activate_plan(self, user: User, plan: Plan, *, source: str = "plan_activation") -> UserSubscription:
        """Assign a plan to a user, emitting allowances and rollover buckets as needed."""
        self.ensure_default_plans()
        now = datetime.utcnow()
        period_end = now + timedelta(days=30)
        trial_end = now + timedelta(days=plan.trial_days) if plan.trial_days else None

        subscription = self.get_primary_subscription(user)
        if subscription is None:
            subscription = UserSubscription(
                id=str(uuid4()),
                user_id=user.id,
                plan_id=plan.id,
            )

        subscription.plan_id = plan.id
        subscription.status = SubscriptionStatus.TRIALING if trial_end else SubscriptionStatus.ACTIVE
        subscription.payg_enabled = plan.payg_enabled
        subscription.current_period_start = now
        subscription.current_period_end = period_end
        subscription.trial_ends_at = trial_end
        subscription.is_primary = True
        subscription.metadata_json = (subscription.metadata_json or {}) | {"source": source}
        self.db.add(subscription)

        usage_bonus_rate = float(plan.usage_bonus_rate) if plan.usage_bonus_rate is not None else self.config.default_usage_bonus
        usage_total = int(plan.rc_monthly * usage_bonus_rate)

        allowance_specs = [
            (AllowanceType.BC, plan.bc_monthly, RolloverPolicy.ONE_CYCLE),
            (AllowanceType.RC, plan.rc_monthly, RolloverPolicy.ONE_CYCLE),
        ]
        if usage_total > 0:
            allowance_specs.append((AllowanceType.USAGE, usage_total, RolloverPolicy.NONE))

        for allowance_type, total, rollover in allowance_specs:
            if total <= 0:
                continue
            self._upsert_allowance(
                user=user,
                plan=plan,
                allowance_type=allowance_type,
                total=total,
                rollover_policy=rollover,
                expires_at=period_end,
                source=source,
            )

        self.db.flush()
        return subscription

    def grant_allowance(
        self,
        *,
        user: User,
        plan: Optional[Plan],
        allowance_type: AllowanceType,
        total: int,
        window: Optional[AllowanceWindow] = None,
        rollover_policy: Optional[RolloverPolicy] = None,
        expires_at: Optional[datetime] = None,
        source: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Allowance:
        if total <= 0:
            raise ValueError("Allowance total must be positive")

        defaults = self.config.allowance_defaults.get(allowance_type.value.lower()) if self.config else None
        allowance = Allowance(
            id=str(uuid4()),
            user_id=user.id,
            plan_id=plan.id if plan else None,
            type=allowance_type,
            total=total,
            used=0,
            window=window or (defaults.window if defaults else AllowanceWindow.MONTHLY),
            rollover_policy=rollover_policy or (defaults.rollover_policy if defaults else RolloverPolicy.NONE),
            expires_at=expires_at,
            source=source,
            metadata_json=metadata or {},
        )
        self.db.add(allowance)
        self.db.flush()
        return allowance

    def revoke_allowance(self, allowance: Allowance, *, reason: Optional[str] = None) -> Allowance:
        allowance.expires_at = datetime.utcnow()
        if reason:
            metadata = allowance.metadata_json or {}
            metadata.setdefault("revocations", []).append({"at": datetime.utcnow().isoformat(), "reason": reason})
            allowance.metadata_json = metadata
        self.db.add(allowance)
        self.db.flush()
        return allowance

    # ------------------------------------------------------------------
    # Consumption flow
    # ------------------------------------------------------------------
    def would_consume(self, user: User, *, allowance_type: AllowanceType, amount: int) -> Tuple[int, int]:
        """Return (available, rollover_available) without mutating state."""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        allowances = self._iter_allowances(user, allowance_type)
        total_available = sum(max(a.total - a.used, 0) for a in allowances)
        rollover = self._rollover_available(user, allowance_type)
        return total_available + rollover, rollover

    def consume(
        self,
        *,
        user: User,
        allowance_type: AllowanceType,
        amount: int,
        action: str,
        complexity_score: int = 0,
        action_hash: Optional[str] = None,
        metadata: Optional[dict] = None,
        allow_payg: bool = True,
    ) -> ConsumptionResult:
        """Consume allowance, honoring rollover, free-tier auto-fix, and PAYG."""
        if amount <= 0:
            raise ValueError("Amount must be positive")

        existing = None
        if action_hash:
            existing = self.db.scalar(
                select(ConsumptionEvent).where(ConsumptionEvent.action_hash == action_hash)
            )
            if existing:
                return ConsumptionResult(event=existing, total_deducted=existing.amount)

        remaining = amount
        total_deducted = 0
        last_allowance: Optional[Allowance] = None

        # Step 1: consume rollover credits first
        for bucket in self._iter_rollover_buckets(user, allowance_type):
            if remaining <= 0:
                break
            if bucket.remain <= 0:
                continue
            deduct = min(bucket.remain, remaining)
            bucket.remain -= deduct
            remaining -= deduct
            total_deducted += deduct
            self.db.add(bucket)

        # Step 2: consume current cycle allowances
        for allowance in self._iter_allowances(user, allowance_type):
            if remaining <= 0:
                break
            available = max(allowance.total - allowance.used, 0)
            if available <= 0:
                continue
            deduct = min(available, remaining)
            allowance.used += deduct
            remaining -= deduct
            total_deducted += deduct
            last_allowance = allowance
            self.db.add(allowance)

        autofix_record: Optional[AllowanceDailyAutofix] = None
        payg_charge: Optional[OverageCharge] = None

        if remaining > 0:
            subscription = self.get_primary_subscription(user)
            if subscription and subscription.plan and subscription.plan.name.lower() == "free":
                autofix_record = self._apply_autofix(subscription, user)
                remaining = 0  # Covered by free auto-fix grant
            elif subscription and subscription.payg_enabled and allow_payg:
                payg_charge = self._create_payg_charge(user, allowance_type, remaining, action)
                remaining = 0
            else:
                raise AllowanceExhaustedError(
                    f"Insufficient {allowance_type.value} allowance for action '{action}'"
                )

        event = self._log_consumption_event(
            user=user,
            allowance=last_allowance,
            allowance_type=allowance_type,
            amount=amount,
            action=action,
            complexity_score=complexity_score,
            action_hash=action_hash,
            metadata=metadata,
            autofix_record=autofix_record,
            payg_charge=payg_charge,
        )

        self.db.commit()
        self.db.refresh(event)
        if last_allowance:
            self.db.refresh(last_allowance)
        if payg_charge:
            self.db.refresh(payg_charge)
        if autofix_record:
            self.db.refresh(autofix_record)

        return ConsumptionResult(
            event=event,
            total_deducted=total_deducted,
            payg_triggered=payg_charge,
            autofix_grant=autofix_record,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _iter_allowances(self, user: User, allowance_type: AllowanceType) -> Iterable[Allowance]:
        stmt = (
            select(Allowance)
            .where(
                Allowance.user_id == user.id,
                Allowance.type == allowance_type,
                or_(
                    Allowance.expires_at.is_(None),
                    Allowance.expires_at > datetime.utcnow(),
                ),
            )
            .order_by(Allowance.expires_at.asc().nulls_last(), Allowance.created_at.asc())
        )
        return self.db.scalars(stmt)

    def _iter_rollover_buckets(self, user: User, allowance_type: AllowanceType) -> Iterable[RolloverBucket]:
        stmt = (
            select(RolloverBucket)
            .join(Allowance, Allowance.id == RolloverBucket.allowance_id)
            .where(
                RolloverBucket.user_id == user.id,
                Allowance.type == allowance_type,
                or_(
                    RolloverBucket.expires_at.is_(None),
                    RolloverBucket.expires_at > datetime.utcnow(),
                ),
                RolloverBucket.remain > 0,
            )
            .order_by(RolloverBucket.expires_at.asc().nulls_last(), RolloverBucket.created_at.asc())
        )
        return self.db.scalars(stmt)

    def _rollover_available(self, user: User, allowance_type: AllowanceType) -> int:
        stmt = (
            select(func.coalesce(func.sum(RolloverBucket.remain), 0))
            .join(Allowance, Allowance.id == RolloverBucket.allowance_id)
            .where(
                RolloverBucket.user_id == user.id,
                Allowance.type == allowance_type,
                or_(
                    RolloverBucket.expires_at.is_(None),
                    RolloverBucket.expires_at > datetime.utcnow(),
                ),
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def _apply_autofix(self, subscription: UserSubscription, user: User) -> AllowanceDailyAutofix:
        limit = subscription.metadata_json.get("autofix_limit") if subscription.metadata_json else None
        limit = limit or self.config.auto_fix_daily_limit
        date_key = datetime.utcnow().strftime("%Y-%m-%d")
        record = self.db.scalar(
            select(AllowanceDailyAutofix).where(
                AllowanceDailyAutofix.user_id == user.id,
                AllowanceDailyAutofix.date_key == date_key,
            )
        )
        if record is None:
            record = AllowanceDailyAutofix(
                id=str(uuid4()),
                user_id=user.id,
                date_key=date_key,
                limit=limit,
                consumed=0,
            )
        if record.consumed >= limit:
            raise AutoFixLimitExceeded(f"Daily Auto-fix limit {limit} reached for {date_key}")
        record.consumed += 1
        self.db.add(record)
        return record

    def _create_payg_charge(
        self,
        user: User,
        allowance_type: AllowanceType,
        amount: int,
        action: str,
    ) -> OverageCharge:
        charge = OverageCharge(
            id=str(uuid4()),
            user_id=user.id,
            metric=allowance_type.value,
            amount=amount,
            status=OverageChargeStatus.PENDING,
            metadata_json={"action": action, "source": "billing_service"},
        )
        self.db.add(charge)
        return charge

    def _log_consumption_event(
        self,
        *,
        user: User,
        allowance: Optional[Allowance],
        allowance_type: AllowanceType,
        amount: int,
        action: str,
        complexity_score: int,
        action_hash: Optional[str],
        metadata: Optional[dict],
        autofix_record: Optional[AllowanceDailyAutofix],
        payg_charge: Optional[OverageCharge],
    ) -> ConsumptionEvent:
        enriched_metadata = metadata.copy() if metadata else {}
        enriched_metadata.update(
            {
                "allowance_type": allowance_type.value,
                "autofix_applied": bool(autofix_record),
                "payg_charge_id": payg_charge.id if payg_charge else None,
            }
        )
        event = ConsumptionEvent(
            id=str(uuid4()),
            user_id=user.id,
            allowance_id=allowance.id if allowance else None,
            type=action,
            amount=amount,
            complexity_score=complexity_score,
            action_hash=action_hash or f"{user.id}:{action}:{datetime.utcnow().isoformat()}",
            metadata_json=enriched_metadata,
        )
        self.db.add(event)
        return event

    def grant_daily_autofix_bc(self, user: User, *, today: Optional[date] = None) -> Optional[Allowance]:
        """Ensure the user receives the daily Auto-fix BC allowance."""
        if self.config.free_daily_bc <= 0:
            return None
        today = today or datetime.utcnow().date()
        start_dt = datetime(today.year, today.month, today.day)
        expires_at = start_dt + timedelta(days=1)
        source = f"autofix_daily_bc::{today.isoformat()}"

        allowance = self.db.scalar(
            select(Allowance).where(
                Allowance.user_id == user.id,
                Allowance.source == source,
                Allowance.type == AllowanceType.BC,
            )
        )
        metadata = {
            "source": "auto_fix_daily",
            "date": today.isoformat(),
            "notes": "Daily Auto-fix credit grant",
        }
        if allowance:
            allowance.total = self.config.free_daily_bc
            allowance.used = min(allowance.used or 0, allowance.total)
            allowance.expires_at = expires_at
            allowance.metadata_json = (allowance.metadata_json or {}) | metadata
            self.db.add(allowance)
        else:
            allowance = self.grant_allowance(
                user=user,
                plan=None,
                allowance_type=AllowanceType.BC,
                total=self.config.free_daily_bc,
                window=AllowanceWindow.DAILY,
                rollover_policy=RolloverPolicy.NONE,
                expires_at=expires_at,
                source=source,
                metadata=metadata,
            )
        self.db.flush()
        return allowance

    def cleanup_autofix_counters(self, older_than: date) -> int:
        """Remove daily Auto-fix counters prior to the given date."""
        cutoff_key = older_than.isoformat()
        result = self.db.execute(
            delete(AllowanceDailyAutofix).where(AllowanceDailyAutofix.date_key < cutoff_key)
        )
        return result.rowcount or 0

    def ensure_budget_guard(
        self,
        user: User,
        *,
        monthly_cap: float,
        behavior: Optional[BudgetGuardBehavior] = None,
        notify: bool = True,
        currency: str = "usd",
    ) -> BudgetGuard:
        """Create or update a BudgetGuard record for the user."""
        guard = self.db.scalar(
            select(BudgetGuard).where(
                BudgetGuard.user_id == user.id,
                BudgetGuard.workspace_id.is_(None),
            )
        )
        cap_decimal = Decimal(str(monthly_cap))
        if guard is None:
            guard = BudgetGuard(
                id=str(uuid4()),
                user_id=user.id,
                workspace_id=None,
                monthly_cap=cap_decimal,
                behavior=behavior or BudgetGuardBehavior.THROTTLE,
                notify=notify,
                currency=currency,
                current_window_spend=Decimal("0"),
            )
        else:
            guard.monthly_cap = cap_decimal
            guard.behavior = behavior or guard.behavior or BudgetGuardBehavior.THROTTLE
            guard.notify = notify
            guard.currency = guard.currency or currency
        self.db.add(guard)
        self.db.flush()
        return guard

    def _upsert_allowance(
        self,
        *,
        user: User,
        plan: Plan,
        allowance_type: AllowanceType,
        total: int,
        rollover_policy: RolloverPolicy,
        expires_at: datetime,
        source: str,
    ) -> Allowance:
        existing = self.db.scalar(
            select(Allowance).where(
                Allowance.user_id == user.id,
                Allowance.plan_id == plan.id,
                Allowance.type == allowance_type,
            )
        )
        metadata = {
            "plan_name": plan.name,
            "source": source,
            "rollover_policy": rollover_policy.value,
        }
        if existing is None:
            return self.grant_allowance(
                user=user,
                plan=plan,
                allowance_type=allowance_type,
                total=total,
                window=AllowanceWindow.MONTHLY,
                rollover_policy=rollover_policy,
                expires_at=expires_at,
                source=source,
                metadata=metadata,
            )

        remaining = max(existing.total - existing.used, 0)
        if remaining > 0 and rollover_policy != RolloverPolicy.NONE:
            rollover_bucket = RolloverBucket(
                id=str(uuid4()),
                user_id=user.id,
                allowance_id=existing.id,
                remain=remaining,
                expires_at=self._calculate_rollover_expiry(expires_at, rollover_policy),
            )
            self.db.add(rollover_bucket)

        existing.total = total
        existing.used = 0
        existing.rollover_policy = rollover_policy
        existing.expires_at = expires_at
        existing.metadata_json = (existing.metadata_json or {}) | metadata
        self.db.add(existing)
        return existing

    def _calculate_rollover_expiry(self, current_period_end: datetime, rollover_policy: RolloverPolicy) -> datetime:
        if rollover_policy == RolloverPolicy.ONE_CYCLE:
            return current_period_end + timedelta(days=30)
        if rollover_policy == RolloverPolicy.ANNUAL:
            return current_period_end + timedelta(days=365)
        return current_period_end
