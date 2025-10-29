"""Lightweight loader for billing configuration YAML."""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from app.core.config import PROJECT_ROOT


@dataclass(frozen=True)
class AllowanceDefault:
    window: str = "monthly"
    rollover_policy: str = "none"


@dataclass(frozen=True)
class BillingConfig:
    version: int = 1
    auto_fix_daily_limit: int = 3
    default_usage_bonus: float = 0.2
    free_daily_bc: int = 1
    payg_default_enabled: bool = True
    scale_plan_price: float = 225.0
    trial_days_default: int = 1
    shared_modes: Dict[str, str] = field(default_factory=dict)
    allowance_defaults: Dict[str, AllowanceDefault] = field(default_factory=dict)
    raw: Dict[str, Any] = field(default_factory=dict)


DEFAULT_CONFIG = BillingConfig()


def _load_yaml(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def _build_config(data: Dict[str, Any]) -> BillingConfig:
    allowance_defaults = {
        key: AllowanceDefault(
            window=value.get("window", "monthly"),
            rollover_policy=value.get("rollover_policy", "none"),
        )
        for key, value in (data.get("allowance_defaults") or {}).items()
    }
    return BillingConfig(
        version=data.get("version", DEFAULT_CONFIG.version),
        auto_fix_daily_limit=int(data.get("auto_fix_daily_limit", DEFAULT_CONFIG.auto_fix_daily_limit)),
        default_usage_bonus=float(data.get("default_usage_bonus", DEFAULT_CONFIG.default_usage_bonus)),
        free_daily_bc=int(data.get("free_daily_bc", DEFAULT_CONFIG.free_daily_bc)),
        payg_default_enabled=bool(data.get("payg_default_enabled", DEFAULT_CONFIG.payg_default_enabled)),
        scale_plan_price=float(data.get("scale_plan_price", DEFAULT_CONFIG.scale_plan_price)),
        trial_days_default=int(data.get("trial_days_default", DEFAULT_CONFIG.trial_days_default)),
        shared_modes=data.get("shared_modes", DEFAULT_CONFIG.shared_modes),
        allowance_defaults=allowance_defaults,
        raw=data,
    )


@lru_cache(maxsize=1)
def get_billing_config(override_path: Optional[Path] = None) -> BillingConfig:
    """Load billing configuration from YAML once per process."""
    config_path = override_path or (PROJECT_ROOT / "billing_config.yaml")
    data = _load_yaml(config_path)
    if not data:
        return DEFAULT_CONFIG
    return _build_config(data)
