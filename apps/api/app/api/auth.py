"""Authentication routes for VibeAny."""
from __future__ import annotations

import hashlib
import httpx
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user_providers import UserProvider
from app.models.users import User
from app.services import auth_service
from app.services.oauth_providers import get_provider, CONFIGS


router = APIRouter()


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=auth_service.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_max_age,
        domain=settings.cookie_domain,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=auth_service.SESSION_COOKIE_NAME,
        domain=settings.cookie_domain,
        path="/",
    )


def _hash_access_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "provider": user.provider,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "level": user.level,
        "points": user.points,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "is_email_verified": user.is_email_verified,
        "providers": [
            {
                "provider": provider.provider,
                "provider_user_id": provider.provider_user_id,
                "linked_at": provider.linked_at.isoformat(),
            }
            for provider in sorted(
                user.providers,
                key=lambda p: p.linked_at or datetime.min,
            )
        ],
    }


def _find_user_by_email(db: Session, email: Optional[str]) -> Optional[User]:
    if not email:
        return None
    normalized = email.lower()
    return db.query(User).filter(func.lower(User.email) == normalized).first()


def _upsert_user(
    db: Session,
    *,
    provider: str,
    provider_user_id: str,
    email: Optional[str],
    email_verified: bool,
    name: Optional[str],
    avatar_url: Optional[str],
    raw_profile: Optional[dict],
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None,
) -> User:
    now = datetime.utcnow()
    provider_record = (
        db.query(UserProvider)
        .filter(
            UserProvider.provider == provider,
            UserProvider.provider_user_id == provider_user_id,
        )
        .first()
    )

    hashed_access_token = _hash_access_token(access_token)

    if provider_record:
        user = provider_record.user
        provider_record.access_token_hash = hashed_access_token or provider_record.access_token_hash
        provider_record.refresh_token_enc = refresh_token or provider_record.refresh_token_enc
        provider_record.raw_profile = raw_profile or provider_record.raw_profile
        provider_record.updated_at = now
    else:
        user = _find_user_by_email(db, email)
        if not user:
            user = User(
                id=str(uuid4()),
                provider=provider,
                provider_user_id=provider_user_id,
                email=email,
                is_email_verified=email_verified,
                name=name,
                avatar_url=avatar_url,
                level=1,
                points=0,
                created_at=now,
                updated_at=now,
                last_login_at=now,
            )
            db.add(user)
        provider_record = UserProvider(
            user=user,
            provider=provider,
            provider_user_id=provider_user_id,
            access_token_hash=hashed_access_token,
            refresh_token_enc=refresh_token,
            raw_profile=raw_profile,
            linked_at=now,
        )
        db.add(provider_record)

    # Update user profile details
    if email and (not user.email or user.email.lower() != email.lower()):
        user.email = email
    if email_verified:
        user.is_email_verified = True
    if name:
        user.name = name
    if avatar_url:
        user.avatar_url = avatar_url
    if not user.provider:
        user.provider = provider
    if not user.provider_user_id:
        user.provider_user_id = provider_user_id
    user.last_login_at = now
    user.updated_at = now

    db.flush()
    return user


@router.get("/providers")
def list_providers():
    """Return available OAuth providers."""
    providers = []
    base_url = settings.api_base_url.rstrip("/") if settings.api_base_url else ""
    for key, config in CONFIGS.items():
        if not config.is_configured:
            continue
        entry = {
            "id": key,
            "name": config["name"],
        }
        if key == "google":
            entry.update(
                {
                    "type": "gis",
                    "client_id": config.client_id,
                    "ux_mode": settings.google_login_ux_mode,
                }
            )
        else:
            entry.update(
                {
                    "type": "oauth",
                    "login_url": f"{base_url}/api/auth/login/{key}" if base_url else f"/api/auth/login/{key}",
                }
            )
        providers.append(entry)
    return {"providers": providers}


def _build_callback_url(provider: str, request: Request) -> str:
    base = settings.api_base_url.rstrip("/") if settings.api_base_url else ""
    if base:
        return f"{base}/api/auth/callback/{provider}"
    return str(request.url_for("oauth_callback", provider=provider))


class GoogleVerifyRequest(BaseModel):
    id_token: str


def _verify_google_id_token(token: str, audience: str) -> dict:
    try:
        id_info = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience,
        )
    except GoogleAuthError as exc:
        raise HTTPException(status_code=400, detail="Invalid Google ID token") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid Google ID token") from exc

    issuer = id_info.get("iss")
    if issuer not in {"https://accounts.google.com", "accounts.google.com"}:
        raise HTTPException(status_code=400, detail="Invalid Google token issuer")

    token_audience = id_info.get("aud")
    if token_audience != audience:
        raise HTTPException(status_code=400, detail="Google ID token audience mismatch")

    return id_info


@router.post("/google/verify")
async def verify_google_login(payload: GoogleVerifyRequest, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    audience = settings.google_audience or settings.google_client_id
    try:
        id_info = _verify_google_id_token(payload.id_token, audience)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Failed to verify Google ID token") from exc

    provider_user_id = id_info.get("sub")
    if not provider_user_id:
        raise HTTPException(status_code=400, detail="Missing Google user identifier")

    email = id_info.get("email")
    email_verified = bool(id_info.get("email_verified"))
    name = id_info.get("name")
    avatar_url = id_info.get("picture")

    user = _upsert_user(
        db,
        provider="google",
        provider_user_id=str(provider_user_id),
        email=email,
        email_verified=email_verified,
        name=name,
        avatar_url=avatar_url,
        raw_profile={
            "email": email,
            "email_verified": email_verified,
            "name": name,
            "picture": avatar_url,
            "given_name": id_info.get("given_name"),
            "family_name": id_info.get("family_name"),
            "locale": id_info.get("locale"),
        },
    )
    db.commit()

    session_token = auth_service.create_session_token(user.id)
    response = JSONResponse({"ok": True, "user": _serialize_user(user)})
    _set_auth_cookie(response, session_token)
    return response


@router.get("/login/{provider}")
async def login(provider: str, request: Request, redirect_to: Optional[str] = None):
    """Redirect user to provider authorization page."""
    config = get_provider(provider)
    if not config.is_configured:
        raise HTTPException(status_code=503, detail=f"{config['name']} login is not configured")
    if provider == "google" and not config.get("client_secret"):
        raise HTTPException(status_code=400, detail="Google redirect login is disabled; use the Google Identity Services button.")

    state = auth_service.create_state_token(provider, redirect_to)
    callback_url = _build_callback_url(provider, request)

    params = {
        "client_id": config.client_id,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
    }

    if provider == "google":
        params.update({
            "access_type": "offline",
            "prompt": "select_account",
        })

    authorize_url = httpx.URL(config["authorize_url"]).include_query_params(**params)
    return RedirectResponse(str(authorize_url))


async def _exchange_token(config, code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        if config["name"] == "Google":
            data = {
                "client_id": config.client_id,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }
            client_secret = config.get("client_secret")
            if client_secret:
                data["client_secret"] = client_secret
            response = await client.post(config["token_url"], data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        else:
            data = {
                "client_id": config.client_id,
                "client_secret": config.client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            }
            response = await client.post(
                config["token_url"],
                data=data,
                headers={"Accept": "application/json"},
            )

        response.raise_for_status()
        return response.json()


async def _fetch_user_info(config, access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=15) as client:
        if config["name"] == "GitHub":
            headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        resp = await client.get(config["user_url"], headers=headers)
        resp.raise_for_status()
        data = resp.json()

        email = data.get("email")
        email_verified = bool(data.get("email_verified"))

        if config["name"] == "GitHub" and config.get("emails_url"):
            emails_resp = await client.get(config["emails_url"], headers=headers)
            if emails_resp.status_code == 200:
                for email_entry in emails_resp.json():
                    if email_entry.get("primary"):
                        email = email_entry.get("email")
                        email_verified = bool(email_entry.get("verified"))
                        if email and email_verified:
                            break
        return {
            "profile": data,
            "email": email,
            "email_verified": email_verified,
            "name": data.get("name") or data.get("login"),
            "avatar_url": data.get("picture") or data.get("avatar_url"),
            "provider_user_id": data.get(config["user_id_field"]),
        }


@router.get("/callback/{provider}", name="oauth_callback")
async def auth_callback(provider: str, request: Request, code: str, state: str, db: Session = Depends(get_db)):
    state_data = auth_service.verify_state_token(state)
    if not state_data or state_data.get("provider") != provider:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    config = get_provider(provider)
    if not config.is_configured:
        raise HTTPException(status_code=503, detail=f"{config['name']} login is not configured")
    callback_url = _build_callback_url(provider, request)

    token_payload = await _exchange_token(config, code, callback_url)
    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to obtain access token")

    user_info = await _fetch_user_info(config, access_token)
    provider_user_id = user_info.get("provider_user_id")
    if not provider_user_id:
        raise HTTPException(status_code=400, detail="Failed to obtain user profile")

    user = _upsert_user(
        db,
        provider=provider,
        provider_user_id=str(provider_user_id),
        email=user_info.get("email"),
        email_verified=bool(user_info.get("email_verified")),
        name=user_info.get("name"),
        avatar_url=user_info.get("avatar_url"),
        raw_profile=user_info.get("profile"),
        access_token=access_token if provider == "github" else None,
        refresh_token=token_payload.get("refresh_token"),
    )
    db.commit()

    session_token = auth_service.create_session_token(user.id)
    redirect_target = state_data.get("redirect_to") or f"{settings.frontend_base_url}/account"

    response = RedirectResponse(url=redirect_target)
    _set_auth_cookie(response, session_token)
    return response


@router.post("/logout")
async def logout():
    response = JSONResponse({"ok": True})
    _clear_auth_cookie(response)
    return response


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return _serialize_user(user)
