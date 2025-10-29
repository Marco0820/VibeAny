"""Third-party authentication provider mappings for VibeAny users."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserProvider(Base):
    """Maps a VibeAny user to an external authentication provider account."""

    __tablename__ = "user_providers"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_account"),
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    provider_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    access_token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    refresh_token_enc: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    raw_profile: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    linked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="providers")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<UserProvider provider={self.provider} user_id={self.user_id}>"
