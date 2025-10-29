"""Stripe payment helpers for point top-ups."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import stripe
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payments import PaymentProvider, PaymentStatus
from app.models.users import User
from app.services.payment_service import PaymentService
from app.services.points_service import PointsService, RECHARGE_PACKAGES_BY_ID


class StripeConfigurationError(RuntimeError):
    """Raised when Stripe is not configured for the environment."""


class StripePaymentService:
    """Facade over the stripe SDK plus persistence."""

    def __init__(self, db: Session):
        if not settings.stripe_api_key:
            raise StripeConfigurationError("Stripe API key is not configured")
        stripe.api_key = settings.stripe_api_key
        self.db = db
        self.payment_service = PaymentService(db)
        self.points_service = PointsService(db)

    # ------------------------------------------------------------------
    # Customer helpers
    # ------------------------------------------------------------------
    def ensure_customer(self, user: User) -> str:
        metadata = user.metadata_json or {}
        customer_id = metadata.get("stripe_customer_id")
        if customer_id:
            return customer_id
        customer = stripe.Customer.create(
            email=user.email or None,
            name=user.name or None,
            metadata={"user_id": user.id},
        )
        metadata["stripe_customer_id"] = customer["id"]
        user.metadata_json = metadata
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return customer["id"]

    # ------------------------------------------------------------------
    # Payment intents
    # ------------------------------------------------------------------
    def create_recharge_intent(
        self,
        *,
        user: User,
        package_id: str,
        automatic_payment_methods: bool = True,
    ) -> dict:
        package = RECHARGE_PACKAGES_BY_ID.get(package_id)
        if not package:
            raise ValueError("Unknown recharge package")

        customer_id = self.ensure_customer(user)
        amount_cents = int(package["price"] * 100)

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=settings.stripe_currency,
            customer=customer_id,
            automatic_payment_methods={"enabled": automatic_payment_methods},
            metadata={
                "user_id": user.id,
                "package_id": package_id,
                "points": str(package["points"]),
            },
        )

        payment = self.payment_service.create_payment(
            user_id=user.id,
            provider=PaymentProvider.STRIPE,
            amount=amount_cents,
            currency=settings.stripe_currency,
            provider_payment_id=intent["id"],
            provider_customer_id=customer_id,
            package_id=package_id,
            points=int(package["points"]),
            status=self._map_status(intent["status"]),
            metadata={"package_name": package["name"]},
            raw_payload=intent.to_dict_recursive(),
        )

        return {
            "payment": payment,
            "client_secret": intent.get("client_secret"),
            "stripe_payment_intent_id": intent["id"],
        }

    # ------------------------------------------------------------------
    # Webhook handling
    # ------------------------------------------------------------------
    def construct_event(self, payload: bytes, signature: Optional[str]):
        if not settings.stripe_webhook_secret:
            raise StripeConfigurationError("Stripe webhook secret not configured")
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=settings.stripe_webhook_secret,
        )

    def handle_payment_intent_succeeded(self, intent: stripe.PaymentIntent, event_payload: dict) -> dict:
        payment = self.payment_service.get_by_provider_payment_id(
            PaymentProvider.STRIPE, intent["id"]
        )
        if not payment:
            return {"processed": False, "reason": "payment_not_found"}
        if payment.status == PaymentStatus.SUCCEEDED:
            return {"processed": False, "reason": "already_processed"}

        # Credit points if not already credited
        transaction_id = payment.point_transaction_id
        if not transaction_id:
            package_id = payment.package_id
            if not package_id:
                raise RuntimeError("Payment missing package reference")
            transaction = self.points_service.recharge(payment.user, package_id)
            transaction_id = transaction.id

        receipt_url = self._extract_receipt_url(intent)
        updated = self.payment_service.mark_status(
            payment,
            status=PaymentStatus.SUCCEEDED,
            receipt_url=receipt_url,
            processed_at=datetime.utcnow(),
            raw_payload=event_payload,
            point_transaction_id=transaction_id,
        )
        return {"processed": True, "payment_id": updated.id, "transaction_id": transaction_id}

    def handle_payment_intent_failed(self, intent: stripe.PaymentIntent, event_payload: dict) -> dict:
        payment = self.payment_service.get_by_provider_payment_id(
            PaymentProvider.STRIPE, intent["id"]
        )
        if not payment:
            return {"processed": False, "reason": "payment_not_found"}
        self.payment_service.mark_failed(payment, raw_payload=event_payload)
        return {"processed": True, "payment_id": payment.id}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _map_status(stripe_status: str) -> PaymentStatus:
        mapping = {
            "requires_payment_method": PaymentStatus.CREATED,
            "requires_confirmation": PaymentStatus.REQUIRES_ACTION,
            "requires_action": PaymentStatus.REQUIRES_ACTION,
            "processing": PaymentStatus.PROCESSING,
            "succeeded": PaymentStatus.SUCCEEDED,
            "canceled": PaymentStatus.FAILED,
        }
        return mapping.get(stripe_status, PaymentStatus.CREATED)

    @staticmethod
    def _extract_receipt_url(intent: stripe.PaymentIntent) -> Optional[str]:
        charges = intent.get("charges") or {}
        data = charges.get("data") or []
        if not data:
            return None
        charge = data[0]
        receipt = charge.get("receipt_url")
        return receipt
