"""PayPal payment helpers for point top-ups."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payments import PaymentProvider, PaymentStatus
from app.models.users import User
from app.services.payment_service import PaymentService
from app.services.points_service import PointsService, RECHARGE_PACKAGES_BY_ID

PAYPAL_OAUTH_PATH = "/v1/oauth2/token"
PAYPAL_CREATE_ORDER_PATH = "/v2/checkout/orders"
PAYPAL_CAPTURE_ORDER_PATH = "/v2/checkout/orders/{order_id}/capture"
PAYPAL_VERIFY_WEBHOOK_PATH = "/v1/notifications/verify-webhook-signature"


class PayPalConfigurationError(RuntimeError):
    """Raised when PayPal credentials are missing."""


class PayPalAPIError(RuntimeError):
    """Raised when PayPal API returns an unexpected error."""


class PayPalPaymentService:
    """Facade that wraps PayPal REST endpoints and local persistence."""

    _token: Optional[str] = None
    _token_expiry: Optional[datetime] = None

    def __init__(self, db: Session):
        if not settings.paypal_enabled:
            raise PayPalConfigurationError("PayPal credentials are not configured")
        self.db = db
        self.payment_service = PaymentService(db)
        self.points_service = PointsService(db)

    # ------------------------------------------------------------------
    # OAuth helpers (shared cache on class level)
    # ------------------------------------------------------------------
    @classmethod
    def _get_cached_token(cls) -> Optional[str]:
        if cls._token and cls._token_expiry and datetime.utcnow() < cls._token_expiry:
            return cls._token
        return None

    @classmethod
    def _set_cached_token(cls, token: str, expires_in: int) -> None:
        cls._token = token
        cls._token_expiry = datetime.utcnow() + timedelta(seconds=max(expires_in - 60, 60))

    def _obtain_access_token(self) -> str:
        cached = self._get_cached_token()
        if cached:
            return cached
        auth = (settings.paypal_client_id, settings.paypal_client_secret)
        data = {"grant_type": "client_credentials"}
        response = httpx.post(
            f"{settings.paypal_base_url}{PAYPAL_OAUTH_PATH}",
            auth=auth,
            data=data,
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            timeout=15,
        )
        if response.status_code != 200:
            raise PayPalAPIError(f"Failed to obtain PayPal token: {response.text}")
        payload = response.json()
        token = payload.get("access_token")
        if not token:
            raise PayPalAPIError("PayPal response missing access_token")
        expires_in = int(payload.get("expires_in", 300))
        self._set_cached_token(token, expires_in)
        return token

    def _client_headers(self) -> dict:
        token = self._obtain_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Order creation & capture
    # ------------------------------------------------------------------
    def create_recharge_order(self, *, user: User, package_id: str) -> dict:
        package = RECHARGE_PACKAGES_BY_ID.get(package_id)
        if not package:
            raise ValueError("Unknown recharge package")
        amount_value = f"{package['price']:.2f}"
        body = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": package_id,
                    "amount": {
                        "currency_code": settings.paypal_currency.upper(),
                        "value": amount_value,
                    },
                    "custom_id": user.id,
                }
            ],
            "application_context": {
                "shipping_preference": "NO_SHIPPING",
                "user_action": "PAY_NOW",
            },
        }
        response = httpx.post(
            f"{settings.paypal_base_url}{PAYPAL_CREATE_ORDER_PATH}",
            headers=self._client_headers(),
            json=body,
            timeout=20,
        )
        if response.status_code not in {201, 200}:
            raise PayPalAPIError(f"Failed to create PayPal order: {response.text}")
        data = response.json()
        order_id = data.get("id")
        if not order_id:
            raise PayPalAPIError("PayPal order missing id")

        approval_url = None
        for link in data.get("links", []) or []:
            if link.get("rel") == "approve":
                approval_url = link.get("href")
                break

        payment = self.payment_service.create_payment(
            user_id=user.id,
            provider=PaymentProvider.PAYPAL,
            amount=int(package["price"] * 100),
            currency=settings.paypal_currency,
            provider_payment_id=order_id,
            package_id=package_id,
            points=int(package["points"]),
            status=PaymentStatus.CREATED,
            metadata={"package_name": package["name"]},
            raw_payload=data,
        )

        return {
            "order": data,
            "payment": payment,
            "approval_url": approval_url,
        }

    def capture_order(self, order_id: str) -> dict:
        response = httpx.post(
            f"{settings.paypal_base_url}{PAYPAL_CAPTURE_ORDER_PATH.format(order_id=order_id)}",
            headers=self._client_headers(),
            timeout=20,
        )
        if response.status_code not in {200, 201}:
            raise PayPalAPIError(f"Failed to capture PayPal order: {response.text}")
        data = response.json()
        status = data.get("status")
        if status not in {"COMPLETED", "APPROVED"}:
            return {"captured": False, "payload": data}

        purchase_units = data.get("purchase_units", [])
        package_id = None
        if purchase_units:
            package_id = purchase_units[0].get("reference_id")
        return {"captured": True, "payload": data, "package_id": package_id}

    # ------------------------------------------------------------------
    # Webhook verification
    # ------------------------------------------------------------------
    def verify_webhook(
        self,
        *,
        transmission_id: str,
        timestamp: str,
        signature: str,
        cert_url: str,
        auth_algo: str,
        webhook_body: bytes,
    ) -> bool:
        if not settings.paypal_webhook_id:
            raise PayPalConfigurationError("PayPal webhook ID is not configured")
        headers = self._client_headers()
        headers["Content-Type"] = "application/json"
        try:
            import json

            webhook_event = json.loads(webhook_body.decode("utf-8")) if webhook_body else {}
        except (ValueError, UnicodeDecodeError) as exc:
            raise PayPalAPIError("Invalid JSON payload for PayPal webhook") from exc
        payload = {
            "auth_algo": auth_algo,
            "cert_url": cert_url,
            "transmission_id": transmission_id,
            "transmission_sig": signature,
            "transmission_time": timestamp,
            "webhook_id": settings.paypal_webhook_id,
            "webhook_event": webhook_event,
        }
        response = httpx.post(
            f"{settings.paypal_base_url}{PAYPAL_VERIFY_WEBHOOK_PATH}",
            headers=headers,
            json=payload,
            timeout=20,
        )
        if response.status_code != 200:
            raise PayPalAPIError(
                f"Failed to verify webhook signature: {response.status_code} {response.text}"
            )
        result = response.json()
        return result.get("verification_status") == "SUCCESS"

    # ------------------------------------------------------------------
    # Processing helpers
    # ------------------------------------------------------------------
    def mark_payment_succeeded(self, order_id: str, *, payload: dict) -> dict:
        payment = self.payment_service.get_by_provider_payment_id(
            PaymentProvider.PAYPAL, order_id
        )
        if not payment:
            return {"processed": False, "reason": "payment_not_found"}
        if payment.status == PaymentStatus.SUCCEEDED:
            return {"processed": False, "reason": "already_processed"}

        transaction_id = payment.point_transaction_id
        if not transaction_id:
            package_id = payment.package_id
            if not package_id:
                raise RuntimeError("Payment missing package reference")
            transaction = self.points_service.recharge(payment.user, package_id)
            transaction_id = transaction.id

        capture_info = self._extract_capture_info(payload)
        receipt_url = capture_info.get("receipt_url")
        updated = self.payment_service.mark_status(
            payment,
            status=PaymentStatus.SUCCEEDED,
            processed_at=datetime.utcnow(),
            receipt_url=receipt_url,
            raw_payload=payload,
            point_transaction_id=transaction_id,
        )
        return {"processed": True, "payment_id": updated.id, "transaction_id": transaction_id}

    @staticmethod
    def _extract_capture_info(payload: dict) -> dict:
        capture_data = {}
        purchase_units = payload.get("purchase_units", [])
        for unit in purchase_units or []:
            payments = unit.get("payments", {})
            captures = payments.get("captures", [])
            if captures:
                capture = captures[0]
                capture_data["id"] = capture.get("id")
                links = capture.get("links", [])
                for link in links or []:
                    if link.get("rel") in {"self", "receipt"}:
                        capture_data["receipt_url"] = link.get("href")
                        break
                break

        if not capture_data:
            links = payload.get("links", [])
            capture_data["id"] = payload.get("id")
            for link in links or []:
                if link.get("rel") in {"self", "receipt"}:
                    capture_data["receipt_url"] = link.get("href")
                    break
        return capture_data
