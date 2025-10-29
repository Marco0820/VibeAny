from pydantic import BaseModel
import os
from pathlib import Path
from typing import Optional, Dict


def find_project_root() -> Path:
    """
    Find the project root directory by looking for specific marker files.
    This ensures consistent behavior regardless of where the API is executed from.
    """
    current_path = Path(__file__).resolve()
    
    # Start from current file and go up
    for parent in [current_path] + list(current_path.parents):
        # Check if this directory has both apps/ and Makefile (project root indicators)
        if (parent / 'apps').is_dir() and (parent / 'Makefile').exists():
            return parent
    
    # Fallback: navigate up from apps/api to project root
    # Current path is likely: /project-root/apps/api/app/core/config.py
    # So we need to go up 4 levels: config.py -> core -> app -> api -> apps -> project-root
    api_dir = current_path.parent.parent.parent  # /project-root/apps/api
    if api_dir.name == 'api' and api_dir.parent.name == 'apps':
        return api_dir.parent.parent  # /project-root
    
    # Last resort: current working directory
    return Path.cwd()


# Get project root once at module load
PROJECT_ROOT = find_project_root()


class Settings(BaseModel):
    api_port: int = int(os.getenv("API_PORT", "8080"))
    api_base_url: Optional[str] = os.getenv("API_BASE_URL")
    
    # SQLite database URL
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{PROJECT_ROOT / 'data' / 'cc.db'}",
    )
    
    # Use project root relative paths
    projects_root: str = os.getenv("PROJECTS_ROOT", str(PROJECT_ROOT / "data" / "projects"))
    projects_root_host: str = os.getenv("PROJECTS_ROOT_HOST", os.getenv("PROJECTS_ROOT", str(PROJECT_ROOT / "data" / "projects")))
    
    preview_port_start: int = int(os.getenv("PREVIEW_PORT_START", "3100"))
    preview_port_end: int = int(os.getenv("PREVIEW_PORT_END", "3999"))

    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    allowed_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")).split(",")
        if origin.strip()
    ]

    google_client_id: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
    google_audience: Optional[str] = os.getenv("GOOGLE_AUDIENCE")
    google_login_ux_mode: str = os.getenv("GOOGLE_LOGIN_UX_MODE", "popup")
    github_client_id: Optional[str] = os.getenv("GITHUB_CLIENT_ID")
    github_client_secret: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET")
    gpt5_api_base: Optional[str] = os.getenv("GPT5_API_BASE")
    gpt5_endpoint_url: str = os.getenv("GPT5_ENDPOINT_URL", os.getenv("GPT5_API_BASE", "") + "/v1/chat/completions")
    gpt5_api_key: Optional[str] = os.getenv("GPT5_API_KEY")
    gpt5_model: Optional[str] = os.getenv("GPT5_MODEL", "gpt-5")
    gpt5_timeout: int = int(os.getenv("GPT5_TIMEOUT", "180"))
    gpt5_health_url: Optional[str] = os.getenv("GPT5_HEALTH_URL")
    gpt5_system_prompt: Optional[str] = os.getenv("GPT5_SYSTEM_PROMPT")
    gpt5_context_file_limit: int = int(os.getenv("GPT5_CONTEXT_FILE_LIMIT", "200"))
    gpt5_context_snippet_limit: int = int(os.getenv("GPT5_CONTEXT_SNIPPET_LIMIT", "8000"))
    gpt5_context_files: list[str] = [
        item.strip()
        for item in os.getenv(
            "GPT5_CONTEXT_FILES",
            "package.json,README.md,apps/web/package.json,apps/web/tsconfig.json",
        ).split(",")
        if item.strip()
    ]

    @property
    def gpt5_additional_headers(self) -> Dict[str, str]:
        raw = os.getenv("GPT5_ADDITIONAL_HEADERS", "")
        headers: Dict[str, str] = {}
        for pair in raw.split(","):
            if ":" not in pair:
                continue
            key, value = pair.split(":", 1)
            headers[key.strip()] = value.strip()
        return headers

    auth_secret: str = os.getenv("AUTH_SECRET", "change-this-secret")
    session_max_age: int = int(os.getenv("SESSION_MAX_AGE", str(60 * 60 * 24 * 30)))
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    cookie_domain: Optional[str] = os.getenv("COOKIE_DOMAIN")

    # Feature flags
    allow_anonymous_generation: bool = os.getenv("ALLOW_ANONYMOUS_GENERATION", "true").lower() == "true"

    # Stripe configuration (can be empty in development)
    stripe_api_key: Optional[str] = os.getenv("STRIPE_API_KEY")
    stripe_publishable_key: Optional[str] = os.getenv("STRIPE_PUBLISHABLE_KEY")
    stripe_webhook_secret: Optional[str] = os.getenv("STRIPE_WEBHOOK_SECRET")
    stripe_currency: str = os.getenv("STRIPE_CURRENCY", "usd")

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.stripe_api_key)

    # PayPal configuration
    paypal_client_id: Optional[str] = os.getenv("PAYPAL_CLIENT_ID")
    paypal_client_secret: Optional[str] = os.getenv("PAYPAL_CLIENT_SECRET")
    paypal_webhook_id: Optional[str] = os.getenv("PAYPAL_WEBHOOK_ID")
    paypal_base_url: str = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
    paypal_currency: str = os.getenv("PAYPAL_CURRENCY", "usd")

    @property
    def paypal_enabled(self) -> bool:
        return bool(self.paypal_client_id and self.paypal_client_secret)

    # Creem configuration
    creem_api_key: Optional[str] = os.getenv("CREEM_API_KEY")
    creem_webhook_secret: Optional[str] = os.getenv("CREEM_WEBHOOK_SECRET")
    creem_base_url: str = os.getenv("CREEM_BASE_URL", "https://api.creem.io")
    creem_success_url: Optional[str] = os.getenv("CREEM_SUCCESS_URL")
    creem_cancel_url: Optional[str] = os.getenv("CREEM_CANCEL_URL")
    creem_product_starter: Optional[str] = os.getenv("CREEM_PRODUCT_STARTER")
    creem_product_creator: Optional[str] = os.getenv("CREEM_PRODUCT_CREATOR")
    creem_product_studio: Optional[str] = os.getenv("CREEM_PRODUCT_STUDIO")

    @property
    def creem_enabled(self) -> bool:
        return bool(self.creem_api_key)


settings = Settings()
