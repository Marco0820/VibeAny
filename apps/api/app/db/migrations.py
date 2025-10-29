"""Database migrations module for SQLite."""

import logging
from pathlib import Path
from typing import Optional, Union

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _get_engine(engine_or_path: Optional[Union[Engine, str, Path]]) -> Optional[Engine]:
    if engine_or_path is None:
        return None
    if isinstance(engine_or_path, Engine):
        return engine_or_path
    if isinstance(engine_or_path, (str, Path)):
        db_path = Path(engine_or_path)
        if not db_path.exists():
            logger.warning("SQLite database path %s does not exist; skipping migrations", db_path)
            return None
        return create_engine(f"sqlite:///{db_path}")
    raise TypeError(f"Unsupported engine type: {type(engine_or_path)!r}")


def run_sqlite_migrations(engine_or_path: Optional[Union[Engine, str, Path]] = None) -> None:
    """
    Run lightweight SQLite migrations for additive schema changes.

    Args:
        engine_or_path: SQLAlchemy engine or filesystem path to the SQLite database file.
    """
    engine = _get_engine(engine_or_path)
    should_dispose = False
    if engine and not isinstance(engine_or_path, Engine):
        should_dispose = True

    if not engine:
        logger.info("No SQLite engine provided; skipping migrations")
        return

    if engine.dialect.name != "sqlite":
        logger.info("Non-SQLite engine detected (%s); skipping SQLite migrations", engine.dialect.name)
        if should_dispose:
            engine.dispose()
        return

    logger.info("Running SQLite migrations")
    with engine.begin() as connection:
        inspector = inspect(connection)
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "is_email_verified" not in user_columns:
            logger.info("Adding is_email_verified column to users table")
            connection.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT 0"))

    if should_dispose:
        engine.dispose()
