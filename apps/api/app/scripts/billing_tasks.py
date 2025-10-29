"""Utility tasks for billing maintenance (Auto-fix reset, BudgetGuard defaults)."""
from __future__ import annotations

import argparse
from datetime import date
from typing import Dict

from sqlalchemy import select

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.db.migrations import run_sqlite_migrations
from app.models.users import User
from app.models.billing import BudgetGuardBehavior
from app.services.billing_service import BillingService


DEFAULT_BUDGET_GUARDS_USD: Dict[str, float] = {
    "free": 50.0,
    "pro": 250.0,
    "scale": 1000.0,
}


def reset_autofix(session, *, today: date) -> None:
    """Grant daily Auto-fix BC allowance for Free plan users and cleanup counters."""
    billing = BillingService(session)
    users = session.scalars(select(User)).all()
    granted = 0

    for user in users:
        subscription = billing.get_primary_subscription(user)
        if not subscription or not subscription.plan:
            continue
        if subscription.plan.name.lower() != "free":
            continue
        billing.grant_daily_autofix_bc(user, today=today)
        granted += 1

    removed = billing.cleanup_autofix_counters(today)
    session.commit()
    print(f"[billing_tasks] Auto-fix daily grant completed for {granted} users. Purged {removed} stale counters.")


def ensure_budget_guards(session) -> None:
    """Ensure each subscribed user has a BudgetGuard entry with default caps."""
    billing = BillingService(session)
    users = session.scalars(select(User)).all()
    ensured = 0

    for user in users:
        subscription = billing.get_primary_subscription(user)
        if not subscription or not subscription.plan:
            continue
        plan_key = subscription.plan.name.lower()
        cap = DEFAULT_BUDGET_GUARDS_USD.get(plan_key)
        if cap is None:
            continue  # Enterprise 或定制客户手动维护
        billing.ensure_budget_guard(
            user,
            monthly_cap=cap,
            behavior=BudgetGuardBehavior.THROTTLE,
            notify=True,
        )
        ensured += 1

    session.commit()
    print(f"[billing_tasks] BudgetGuard ensured for {ensured} users.")


def run_daily(session) -> None:
    """Execute the combined daily maintenance routine."""
    today = date.today()
    reset_autofix(session, today=today)
    ensure_budget_guards(session)


def main() -> None:
    parser = argparse.ArgumentParser(description="Billing maintenance utilities")
    parser.add_argument(
        "--task",
        choices=["reset_autofix", "ensure_budget_guard", "daily"],
        required=True,
        help="Task to execute",
    )
    args = parser.parse_args()

    # Ensure database schema exists (works for SQLite and other engines)
    Base.metadata.create_all(bind=engine)
    run_sqlite_migrations(engine)

    session = SessionLocal()
    try:
        if args.task == "reset_autofix":
            reset_autofix(session, today=date.today())
        elif args.task == "ensure_budget_guard":
            ensure_budget_guards(session)
        elif args.task == "daily":
            run_daily(session)
    finally:
        session.close()


if __name__ == "__main__":
    main()
