"""Utilities for signing and verifying VibeAny session tokens."""
from __future__ import annotations

import secrets
from datetime import datetime
from typing import Optional

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.core.config import settings


SESSION_COOKIE_NAME = "vibeany_session"
OAUTH_STATE_COOKIE = "vibeany_oauth_state"


def _get_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.auth_secret, salt="vibeany-auth")


def create_session_token(user_id: str) -> str:
    serializer = _get_serializer()
    return serializer.dumps({"user_id": user_id})


def verify_session_token(token: str) -> Optional[str]:
    serializer = _get_serializer()
    try:
        data = serializer.loads(token, max_age=settings.session_max_age)
        return data.get("user_id")
    except (BadSignature, SignatureExpired):
        return None


def create_state_token(provider: str, redirect_to: Optional[str] = None) -> str:
    serializer = _get_serializer()
    return serializer.dumps(
        {
            "provider": provider,
            "redirect_to": redirect_to,
            "nonce": secrets.token_urlsafe(8),
            "ts": datetime.utcnow().isoformat(),
        }
    )


def verify_state_token(token: str) -> Optional[dict]:
    serializer = _get_serializer()
    try:
        return serializer.loads(token, max_age=600)
    except (BadSignature, SignatureExpired):
        return None
