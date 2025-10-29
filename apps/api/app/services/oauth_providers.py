"""OAuth provider helpers for Google and GitHub."""
from __future__ import annotations

from typing import Dict

from fastapi import HTTPException

from app.core.config import settings


class OAuthProviderConfig(dict):
    @property
    def requires_secret(self) -> bool:
        return bool(super().get("requires_secret", True))

    @property
    def client_id(self) -> str:
        value = super().get("client_id")
        if not value:
            raise HTTPException(status_code=503, detail=f"{self['name']} client_id not configured")
        return value

    @property
    def client_secret(self) -> str:
        value = super().get("client_secret")
        if self.requires_secret and not value:
            raise HTTPException(status_code=503, detail=f"{self['name']} client_secret not configured")
        return value

    @property
    def is_configured(self) -> bool:
        """Return True when both client id and secret are provided."""
        has_client_id = bool(super().get("client_id"))
        if not has_client_id:
            return False
        if self.requires_secret:
            return bool(super().get("client_secret"))
        return True


CONFIGS: Dict[str, OAuthProviderConfig] = {
    "google": OAuthProviderConfig(
        name="Google",
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        user_url="https://openidconnect.googleapis.com/v1/userinfo",
        scope="openid email profile",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        user_id_field="sub",
        requires_secret=False,
    ),
    "github": OAuthProviderConfig(
        name="GitHub",
        authorize_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        user_url="https://api.github.com/user",
        emails_url="https://api.github.com/user/emails",
        scope="read:user user:email",
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        user_id_field="id",
    ),
}


def get_provider(provider: str) -> OAuthProviderConfig:
    config = CONFIGS.get(provider)
    if not config:
        raise HTTPException(status_code=404, detail="Unsupported provider")
    return config
