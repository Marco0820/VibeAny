"""Shared payment utilities across providers."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.payments import Payment, PaymentProvider, PaymentStatus


class PaymentService:
    """Helper for creating and updating Payment records."""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Creation helpers
    # ------------------------------------------------------------------
    def create_payment(
        self,
        *,
        user_id: str,
        provider: PaymentProvider,
        amount: int,
        currency: str,
        provider_payment_id: str,
        provider_customer_id: Optional[str] = None,
        package_id: Optional[str] = None,
        points: Optional[int] = None,
        status: PaymentStatus = PaymentStatus.CREATED,
        metadata: Optional[dict] = None,
        raw_payload: Optional[dict] = None,
    ) -> Payment:
        payment = Payment(
            id=str(uuid4()),
            user_id=user_id,
            provider=provider,
            status=status,
            amount=amount,
            currency=currency,
            package_id=package_id,
            points=points,
            provider_payment_id=provider_payment_id,
            provider_customer_id=provider_customer_id,
            metadata_json=metadata or {},
            raw_provider_payload=raw_payload,
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    # ------------------------------------------------------------------
    # Lookup helpers
    # ------------------------------------------------------------------
    def get_by_provider_payment_id(
        self, provider: PaymentProvider, provider_payment_id: str
    ) -> Optional[Payment]:
        return (
            self.db.query(Payment)
            .filter(
                Payment.provider == provider,
                Payment.provider_payment_id == provider_payment_id,
            )
            .one_or_none()
        )

    def get(self, payment_id: str) -> Optional[Payment]:
        return self.db.query(Payment).filter(Payment.id == payment_id).one_or_none()

    # ------------------------------------------------------------------
    # Status updates
    # ------------------------------------------------------------------
    def mark_status(
        self,
        payment: Payment,
        *,
        status: PaymentStatus,
        receipt_url: Optional[str] = None,
        raw_payload: Optional[dict] = None,
        processed_at: Optional[datetime] = None,
        point_transaction_id: Optional[str] = None,
    ) -> Payment:
        payment.status = status
        if receipt_url is not None:
            payment.provider_receipt_url = receipt_url
        if processed_at is not None:
            payment.processed_at = processed_at
        if point_transaction_id is not None:
            payment.point_transaction_id = point_transaction_id
        if raw_payload is not None:
            payment.raw_provider_payload = raw_payload
        payment.updated_at = datetime.utcnow()
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def mark_failed(self, payment: Payment, *, raw_payload: Optional[dict] = None) -> Payment:
        return self.mark_status(
            payment,
            status=PaymentStatus.FAILED,
            raw_payload=raw_payload,
            processed_at=datetime.utcnow(),
        )
