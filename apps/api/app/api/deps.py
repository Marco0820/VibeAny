from typing import Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.users import User
from app.services.auth_service import SESSION_COOKIE_NAME, verify_session_token


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = verify_session_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None
    user_id = verify_session_token(token)
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def get_generation_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Return the authenticated user when required or available for generation flows."""
    if settings.allow_anonymous_generation:
        return get_optional_user(request, db)
    return get_current_user(request, db)
