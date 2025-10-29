"""Creem payment integration helpers."""
from __future__ import annotations

from datetime import datetime
import hashlib
import hmac
import json
from typing import Optional
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payments import PaymentProvider, PaymentStatus, Payment
from app.models.users import User
from app.services.payment_service import PaymentService
from app.services.points_service import PointsService, RECHARGE_PACKAGES_BY_ID


class CreemConfigurationError(RuntimeError):
    """Raised when Creem credentials are missing."""


class CreemAPIError(RuntimeError):
    """Raised when Creem API responds with an error."""


class CreemSignatureError(RuntimeError):
    """Raised when Creem webhook signature cannot be verified."""


class CreemPaymentService:
    """Facade around Creem REST API and local persistence."""

    def __init__(self, db: Session):
        if not settings.creem_enabled:
            raise CreemConfigurationError("Creem integration is not configured")
        self.db = db
        self.payment_service = PaymentService(db)
        self.points_service = PointsService(db)

    # ------------------------------------------------------------------
    # Checkout helpers
    # ------------------------------------------------------------------
    def create_checkout(self, *, user: User, package_id: str) -> dict:
        package = RECHARGE_PACKAGES_BY_ID.get(package_id)
        if not package:
            raise ValueError("Unknown recharge package")

        product_id = self._get_product_id(package_id)
        request_id = f"creem_{uuid4().hex}"

        payload = {
            "product_id": product_id,
            "request_id": request_id,
            "metadata": {
                "user_id": user.id,
                "package_id": package_id,
            },
        }
        if settings.creem_success_url:
            payload["success_url"] = settings.creem_success_url
        if settings.creem_cancel_url:
            payload["cancel_url"] = settings.creem_cancel_url

        response = httpx.post(
            f"{settings.creem_base_url.rstrip('/')}/v1/checkouts",
            headers={"x-api-key": settings.creem_api_key or "", "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        if response.status_code >= 400:
            raise CreemAPIError(f"Creem checkout creation failed: {response.text}")

        data = response.json()
        checkout_id = data.get("checkout_id") or data.get("id")
        checkout_url = data.get("url")
        if not checkout_id or not checkout_url:
            raise CreemAPIError("Creem response missing checkout identifiers")

        payment = self.payment_service.create_payment(
            user_id=user.id,
            provider=PaymentProvider.CREEM,
            amount=int(package["price"] * 100),
            currency="usd",
            provider_payment_id=checkout_id,
            package_id=package_id,
            points=int(package["points"]),
            metadata={"package_name": package["name"], "creem_request_id": request_id},
            raw_payload=data,
        )

        return {
            "checkout_id": checkout_id,
            "checkout_url": checkout_url,
            "payment": payment,
        }

    # ------------------------------------------------------------------
    # Webhook helpers
    # ------------------------------------------------------------------
    def verify_signature(self, signature: Optional[str], payload: bytes) -> bool:
        if not settings.creem_webhook_secret:
            raise CreemConfigurationError("Creem webhook secret not configured")
        if not signature:
            return False
        digest = hmac.new(
            settings.creem_webhook_secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(digest, signature.strip())

    def handle_webhook(self, event: dict) -> dict:
        event_type = event.get("type") or event.get("event_type")
        data = event.get("data") or event
        checkout_id = (
            data.get("checkout_id")
            or data.get("id")
            or event.get("checkout_id")
        )
        order_id = data.get("order_id")

        payment = None
        if checkout_id:
            payment = self.payment_service.get_by_provider_payment_id(
                PaymentProvider.CREEM, checkout_id
            )
        if not payment and order_id:
            payment = self.payment_service.get_by_provider_payment_id(
                PaymentProvider.CREEM, order_id
            )
        if not payment:
            return {"processed": False, "reason": "payment_not_found"}

        status = data.get("status") or event.get("status") or event_type

        if event_type in {"payment.success", "payment.completed", "checkout.completed"}:
            return self._mark_success(payment, data)

        if event_type in {"payment.failed", "checkout.failed", "payment.cancelled"}:
            self.payment_service.mark_failed(payment, raw_payload=data)
            return {"processed": True, "payment_id": payment.id, "status": "failed"}

        # For other events simply attach payload for observability
        payment.raw_provider_payload = data
        self.db.add(payment)
        self.db.commit()
        return {"processed": False, "reason": "ignored", "event_type": event_type}

    def _mark_success(self, payment: Payment, payload: dict) -> dict:
        if payment.status == PaymentStatus.SUCCEEDED:
            return {"processed": False, "reason": "already_processed"}

        transaction_id = payment.point_transaction_id
        if not transaction_id:
            package_id = payment.package_id
            if not package_id:
                raise RuntimeError("Payment missing package reference")
            transaction = self.points_service.recharge(payment.user, package_id)
            transaction_id = transaction.id

        receipt_url = payload.get("receipt_url")
        updated = self.payment_service.mark_status(
            payment,
            status=PaymentStatus.SUCCEEDED,
            processed_at=datetime.utcnow(),
            receipt_url=receipt_url,
            raw_payload=payload,
            point_transaction_id=transaction_id,
        )
        return {
            "processed": True,
            "payment_id": updated.id,
            "transaction_id": transaction_id,
        }

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------
    def get_payment_by_checkout(self, checkout_id: str) -> Optional[Payment]:
        return self.payment_service.get_by_provider_payment_id(
            PaymentProvider.CREEM, checkout_id
        )

    def _get_product_id(self, package_id: str) -> str:
        mapping = {
            "starter": settings.creem_product_starter,
            "creator": settings.creem_product_creator,
            "studio": settings.creem_product_studio,
        }
        product_id = mapping.get(package_id)
        if not product_id:
            raise ValueError("Creem product mapping missing for package")
        return product_id
