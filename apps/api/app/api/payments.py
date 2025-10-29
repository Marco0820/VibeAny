"""Payment endpoints for external providers (Stripe / PayPal / Creem)."""
from __future__ import annotations

from typing import Optional

import json

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.payments import PaymentProvider, Payment
from app.models.users import User
from app.services.paypal_service import (
    PayPalConfigurationError,
    PayPalPaymentService,
    PayPalAPIError,
)
from app.services.points_service import RECHARGE_PACKAGES_BY_ID
from app.services.stripe_service import (
    StripeConfigurationError,
    StripePaymentService,
)
from app.services.creem_service import (
    CreemConfigurationError,
    CreemPaymentService,
    CreemAPIError,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


class StripeIntentRequest(BaseModel):
    package_id: str = Field(..., description="充值套餐 ID，例如 starter")
    automatic_payment_methods: bool = Field(
        default=True,
        description="是否启用 Stripe 自动支付方式（推荐开启）",
    )


class StripeIntentResponse(BaseModel):
    payment_id: str
    client_secret: str
    stripe_payment_intent_id: str
    amount: int
    currency: str
    points: int
    package_id: str
    package_name: Optional[str]
    stripe_publishable_key: Optional[str]


def _ensure_stripe_enabled():
    if not settings.stripe_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured for this environment",
        )


def _ensure_paypal_enabled():
    if not settings.paypal_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PayPal is not configured for this environment",
        )


def _ensure_creem_enabled():
    if not settings.creem_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Creem is not configured for this environment",
        )


class PayPalOrderRequest(BaseModel):
    package_id: str = Field(..., description="充值套餐 ID，例如 starter")


class PayPalOrderResponse(BaseModel):
    payment_id: str
    order_id: str
    approval_url: Optional[str]
    amount: int
    currency: str
    points: int
    package_id: str
    package_name: Optional[str]


class PayPalCaptureRequest(BaseModel):
    order_id: str = Field(..., description="PayPal 订单 ID")


class PayPalCaptureResponse(BaseModel):
    payment_id: str
    status: str
    transaction_id: str
    points: int
    summary: dict
    paypal_payload: dict


class CreemCheckoutRequest(BaseModel):
    package_id: str = Field(..., description="充值套餐 ID，例如 starter")


class CreemCheckoutResponse(BaseModel):
    payment_id: str
    checkout_id: str
    checkout_url: str
    points: int
    package_id: str
    package_name: Optional[str]


class CreemStatusResponse(BaseModel):
    payment_id: str
    status: str
    points: int
    package_id: Optional[str]
    checkout_id: str
    processed_at: Optional[str]


@router.post("/stripe/intent", response_model=StripeIntentResponse)
def create_stripe_intent(
    payload: StripeIntentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_stripe_enabled()
    service = StripePaymentService(db)
    try:
        result = service.create_recharge_intent(
            user=user,
            package_id=payload.package_id,
            automatic_payment_methods=payload.automatic_payment_methods,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except stripe.error.StripeError as exc:  # pragma: no cover - runtime safeguard
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    package = RECHARGE_PACKAGES_BY_ID[payload.package_id]
    payment = result["payment"]
    client_secret = result["client_secret"]
    if not client_secret:
        raise HTTPException(status_code=500, detail="Stripe client secret missing")

    return StripeIntentResponse(
        payment_id=payment.id,
        client_secret=client_secret,
        stripe_payment_intent_id=result["stripe_payment_intent_id"],
        amount=payment.amount,
        currency=payment.currency,
        points=payment.points or int(package["points"]),
        package_id=payment.package_id or payload.package_id,
        package_name=package.get("name"),
        stripe_publishable_key=settings.stripe_publishable_key,
    )


@router.post("/stripe/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    _ensure_stripe_enabled()
    service = StripePaymentService(db)
    payload = await request.body()
    try:
        event = service.construct_event(payload, stripe_signature)
    except StripeConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:  # pragma: no cover - runtime safeguard
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    event_dict = event.to_dict_recursive()
    event_type = event_dict.get("type")
    data_object = event_dict.get("data", {}).get("object", {})

    if event_type == "payment_intent.succeeded":
        result = service.handle_payment_intent_succeeded(data_object, event_dict)
    elif event_type in {"payment_intent.payment_failed", "payment_intent.canceled"}:
        result = service.handle_payment_intent_failed(data_object, event_dict)
    else:
        # For other events we simply acknowledge to avoid unnecessary retries
        result = {"processed": False, "reason": "ignored", "event_type": event_type}

    return {"received": True, **result}


@router.get("/history")
def list_payments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    provider: PaymentProvider = Query(
        PaymentProvider.STRIPE,
        description="Filter payments by provider",
    ),
):
    """Return recent payment orders for the authenticated user."""

    items = (
        db.query(Payment)
        .filter(Payment.user_id == user.id, Payment.provider == provider)
        .order_by(Payment.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": [payment.to_dict() for payment in items],
        "limit": limit,
        "offset": offset,
    }


@router.post("/paypal/order", response_model=PayPalOrderResponse)
def create_paypal_order(
    payload: PayPalOrderRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_paypal_enabled()
    service = PayPalPaymentService(db)
    try:
        result = service.create_recharge_order(user=user, package_id=payload.package_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PayPalAPIError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    payment = result["payment"]
    package = RECHARGE_PACKAGES_BY_ID[payload.package_id]
    return PayPalOrderResponse(
        payment_id=payment.id,
        order_id=result["order"].get("id"),
        approval_url=result.get("approval_url"),
        amount=payment.amount,
        currency=payment.currency,
        points=payment.points or int(package["points"]),
        package_id=payment.package_id or payload.package_id,
        package_name=package.get("name"),
    )


@router.post("/paypal/capture", response_model=PayPalCaptureResponse)
def capture_paypal_order(
    payload: PayPalCaptureRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_paypal_enabled()
    service = PayPalPaymentService(db)
    payment = service.payment_service.get_by_provider_payment_id(
        PaymentProvider.PAYPAL, payload.order_id
    )
    if not payment or payment.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")

    try:
        capture_result = service.capture_order(payload.order_id)
    except PayPalAPIError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not capture_result.get("captured"):
        raise HTTPException(status_code=400, detail="Order not completed")

    mark_result = service.mark_payment_succeeded(
        payload.order_id, payload=capture_result.get("payload", {})
    )
    if not mark_result.get("processed"):
        return PayPalCaptureResponse(
            payment_id=payment.id,
            status=payment.status.value,
            transaction_id=mark_result.get("transaction_id", ""),
            points=payment.points or 0,
            summary=service.points_service.get_summary(payment.user),
            paypal_payload=capture_result.get("payload", {}),
        )

    db.refresh(payment.user)
    summary = service.points_service.get_summary(payment.user)

    return PayPalCaptureResponse(
        payment_id=mark_result["payment_id"],
        status="succeeded",
        transaction_id=mark_result.get("transaction_id", ""),
        points=payment.points or 0,
        summary=summary,
        paypal_payload=capture_result.get("payload", {}),
    )


@router.post("/paypal/webhook", include_in_schema=False)
async def paypal_webhook(
    request: Request,
    paypal_transmission_id: Optional[str] = Header(None, alias="PayPal-Transmission-Id"),
    paypal_transmission_time: Optional[str] = Header(None, alias="PayPal-Transmission-Time"),
    paypal_transmission_sig: Optional[str] = Header(None, alias="PayPal-Transmission-Sig"),
    paypal_cert_url: Optional[str] = Header(None, alias="PayPal-Cert-Url"),
    paypal_auth_algo: Optional[str] = Header(None, alias="PayPal-Auth-Algo"),
    db: Session = Depends(get_db),
):
    _ensure_paypal_enabled()
    required_headers = [
        paypal_transmission_id,
        paypal_transmission_time,
        paypal_transmission_sig,
        paypal_cert_url,
        paypal_auth_algo,
    ]
    if any(header is None for header in required_headers):
        raise HTTPException(status_code=400, detail="Missing PayPal webhook headers")

    body_bytes = await request.body()
    try:
        event = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    service = PayPalPaymentService(db)
    try:
        verified = service.verify_webhook(
            transmission_id=paypal_transmission_id,
            timestamp=paypal_transmission_time,
            signature=paypal_transmission_sig,
            cert_url=paypal_cert_url,
            auth_algo=paypal_auth_algo,
            webhook_body=body_bytes,
        )
    except PayPalConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PayPalAPIError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not verified:
        raise HTTPException(status_code=400, detail="Webhook signature verification failed")

    event_type = event.get("event_type") or event.get("event_name")
    resource = event.get("resource", {})
    order_id = (
        resource.get("supplementary_data", {})
        .get("related_ids", {})
        .get("order_id")
        or resource.get("id")
    )

    processed = {"processed": False, "reason": "ignored", "event_type": event_type}

    if event_type == "PAYMENT.CAPTURE.COMPLETED" and order_id:
        processed = service.mark_payment_succeeded(order_id, payload=resource)

    return {"received": True, "verified": True, **processed}


@router.post("/creem/checkout", response_model=CreemCheckoutResponse)
def create_creem_checkout(
    payload: CreemCheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_creem_enabled()
    service = CreemPaymentService(db)
    try:
        result = service.create_checkout(user=user, package_id=payload.package_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CreemAPIError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    payment = result["payment"]
    package = RECHARGE_PACKAGES_BY_ID[payload.package_id]
    return CreemCheckoutResponse(
        payment_id=payment.id,
        checkout_id=result["checkout_id"],
        checkout_url=result["checkout_url"],
        points=payment.points or int(package["points"]),
        package_id=payment.package_id or payload.package_id,
        package_name=package.get("name"),
    )


@router.get("/creem/status", response_model=CreemStatusResponse)
def creem_payment_status(
    checkout_id: str = Query(..., description="Creem checkout ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_creem_enabled()
    service = CreemPaymentService(db)
    payment = service.get_payment_by_checkout(checkout_id)
    if not payment or payment.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    return CreemStatusResponse(
        payment_id=payment.id,
        status=payment.status.value,
        points=payment.points or 0,
        package_id=payment.package_id,
        checkout_id=checkout_id,
        processed_at=payment.processed_at.isoformat() if payment.processed_at else None,
    )


@router.post("/creem/webhook", include_in_schema=False)
async def creem_webhook(
    request: Request,
    creem_signature: Optional[str] = Header(None, alias="Creem-Signature"),
    db: Session = Depends(get_db),
):
    _ensure_creem_enabled()
    payload = await request.body()
    service = CreemPaymentService(db)
    try:
        verified = service.verify_signature(creem_signature, payload)
    except CreemConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid Creem signature")

    try:
        event = json.loads(payload.decode("utf-8")) if payload else {}
    except (UnicodeDecodeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    result = service.handle_webhook(event)
    return {"received": True, **result}
