import hashlib
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, Request, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.constants.auth import (
    REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_PATH,
    SECONDS_PER_DAY,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_BEARER,
    TOKEN_TYPE_REFRESH,
)
from app.core.config import settings
from app.core.security import create_token, decode_token, verify_password
from app.features.admins.model import Admin
from app.features.auth.model import AdminSession
from app.features.auth.schema import LoginRequest


def _validate_cookie_request_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin is None:
        return

    allowed_origins = {
        allowed_origin.rstrip("/") for allowed_origin in settings.cors_origins
    }
    if origin.rstrip("/") not in allowed_origins:
        raise HTTPException(status_code=403, detail="Request origin is not allowed")


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * SECONDS_PER_DAY,
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH,
    )


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


def _token_hash(token_id: str) -> str:
    return hashlib.sha256(token_id.encode("utf-8")).hexdigest()


def _issue_tokens(admin_id: int, session_id: str, refresh_token_id: str) -> tuple[str, str]:
    claims = {"sub": str(admin_id), "sid": session_id}
    access_token = create_token(
        claims,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        TOKEN_TYPE_ACCESS,
    )
    refresh_token = create_token(
        claims,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        TOKEN_TYPE_REFRESH,
        token_id=refresh_token_id,
    )
    return access_token, refresh_token


def _cleanup_expired_sessions(db: Session, now: datetime) -> None:
    cutoff = now - timedelta(days=settings.ADMIN_SESSION_RETENTION_DAYS)
    db.query(AdminSession).filter(
        or_(
            AdminSession.expires_at < cutoff,
            AdminSession.revoked_at < cutoff,
        )
    ).delete(synchronize_session=False)


def login(db: Session, login_data: LoginRequest, response: Response):
    username = login_data.username.strip()
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin or not verify_password(login_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now = datetime.now(timezone.utc)
    session_id = str(uuid4())
    refresh_token_id = str(uuid4())
    session = AdminSession(
        session_id=session_id,
        admin_id=admin.id,
        refresh_token_hash=_token_hash(refresh_token_id),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    try:
        _cleanup_expired_sessions(db, now)
        db.add(session)
        db.commit()
    except Exception:
        db.rollback()
        raise

    access_token, refresh_token = _issue_tokens(
        admin.id, session_id, refresh_token_id
    )
    _set_refresh_cookie(response, refresh_token)
    _no_store(response)
    return {
        "message": "Login successful",
        "username": admin.username,
        "access_token": access_token,
        "token_type": TOKEN_TYPE_BEARER,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def _refresh_claims(request: Request) -> tuple[str, int, str]:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token is None:
        raise HTTPException(
            status_code=401,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(refresh_token, TOKEN_TYPE_REFRESH)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        admin_id = int(payload.get("sub"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc
    session_id = payload.get("sid")
    token_id = payload.get("jti")
    if not isinstance(session_id, str) or not isinstance(token_id, str):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return session_id, admin_id, token_id


def refresh_access_token(request: Request, response: Response, db: Session):
    _validate_cookie_request_origin(request)
    session_id, admin_id, token_id = _refresh_claims(request)
    now = datetime.now(timezone.utc)
    session = (
        db.query(AdminSession)
        .filter(AdminSession.session_id == session_id)
        .with_for_update()
        .first()
    )
    if (
        session is None
        or session.admin_id != admin_id
        or session.revoked_at is not None
        or session.expires_at <= now
    ):
        db.rollback()
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Admin session is invalid or expired")

    if session.refresh_token_hash != _token_hash(token_id):
        session.revoked_at = now
        db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh token replay detected")

    new_token_id = str(uuid4())
    session.refresh_token_hash = _token_hash(new_token_id)
    session.rotated_at = now
    session.expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    access_token, refresh_token = _issue_tokens(admin_id, session_id, new_token_id)
    _set_refresh_cookie(response, refresh_token)
    _no_store(response)
    return {
        "message": "Access token refreshed",
        "access_token": access_token,
        "token_type": TOKEN_TYPE_BEARER,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def logout(request: Request, response: Response, db: Session):
    _validate_cookie_request_origin(request)
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    payload = decode_token(refresh_token, TOKEN_TYPE_REFRESH) if refresh_token else None
    if payload is not None and isinstance(payload.get("sid"), str):
        session = (
            db.query(AdminSession)
            .filter(AdminSession.session_id == payload["sid"])
            .with_for_update()
            .first()
        )
        if session is not None and session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
        else:
            db.rollback()
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


def get_admin_profile(admin: Admin):
    return admin
