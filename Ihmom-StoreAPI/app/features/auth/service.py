from datetime import timedelta

from fastapi import HTTPException, Request, Response
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
from app.core.security import create_token, verify_password, verify_token
from app.features.admins.model import Admin
from app.features.auth.schema import LoginRequest
from app.shared import crud


def _validate_cookie_request_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin is None:
        return

    allowed_origins = {
        allowed_origin.rstrip("/") for allowed_origin in settings.cors_origins
    }
    if origin.rstrip("/") not in allowed_origins:
        raise HTTPException(
            status_code=403,
            detail="Request origin is not allowed",
        )


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


def login(
    db: Session,
    login_data: LoginRequest,
    response: Response,
):
    username = login_data.username.strip()
    admin = db.query(Admin).filter(Admin.username == username).first()

    if not admin or not verify_password(
        login_data.password,
        admin.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_token(
        {"sub": str(admin.id)},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type=TOKEN_TYPE_ACCESS,
    )
    refresh_token = create_token(
        {"sub": str(admin.id)},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        token_type=TOKEN_TYPE_REFRESH,
    )
    _set_refresh_cookie(response, refresh_token)

    return {
        "message": "Login successful",
        "username": admin.username,
        "access_token": access_token,
        "token_type": TOKEN_TYPE_BEARER,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def refresh_access_token(
    request: Request,
    response: Response,
    db: Session,
):
    _validate_cookie_request_origin(request)
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if refresh_token is None:
        raise HTTPException(
            status_code=401,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    subject = verify_token(
        refresh_token,
        expected_token_type=TOKEN_TYPE_REFRESH,
    )
    if subject is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        admin_id = int(subject)
    except (TypeError, ValueError):
        admin_id = None

    admin = crud.get_by_id(db, Admin, admin_id)
    if admin is None:
        raise HTTPException(
            status_code=401,
            detail="Admin account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    new_access_token = create_token(
        {"sub": str(admin.id)},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type=TOKEN_TYPE_ACCESS,
    )
    new_refresh_token = create_token(
        {"sub": str(admin.id)},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        token_type=TOKEN_TYPE_REFRESH,
    )
    _set_refresh_cookie(response, new_refresh_token)

    return {
        "message": "Access token refreshed",
        "access_token": new_access_token,
        "token_type": TOKEN_TYPE_BEARER,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def logout(request: Request, response: Response):
    _validate_cookie_request_origin(request)
    _clear_refresh_cookie(response)
    return {
        "message": "Logged out successfully",
    }


def get_admin_profile(admin: Admin):
    return admin
