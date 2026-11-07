from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
from fastapi import Depends, HTTPException, Security,Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.constants.auth import (
    ORDER_HISTORY_AUDIENCE,
    ORDER_HISTORY_PURPOSE,
    ORDER_HISTORY_TOKEN_TYPE,
    TOKEN_TYPE_ACCESS,
)
from app.core.config import settings
from app.db.session import get_db
from app.features.admins.model import Admin
from app.shared.phone import phone_identity

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class OrderHistoryClaims:
    phone: str
    order_number: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False


def create_token(
    data: dict,
    expires_delta: timedelta,
    token_type: str,
) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + expires_delta

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": str(uuid4()),
            "token_type": token_type,
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    return encoded_jwt


def verify_token(token: str, expected_token_type: str):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        subject = payload.get("sub")
        token_type = payload.get("token_type")

        if subject is None or token_type != expected_token_type:
            return None

        return subject

    except JWTError:
        return None


def create_order_history_token(
    phone: str,
    order_number: str,
    expires_delta: timedelta,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": phone_identity(phone),
        "order_number": order_number,
        "aud": ORDER_HISTORY_AUDIENCE,
        "purpose": ORDER_HISTORY_PURPOSE,
        "token_type": ORDER_HISTORY_TOKEN_TYPE,
        "exp": now + expires_delta,
        "iat": now,
        "jti": str(uuid4()),
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_order_history_token(token: str) -> OrderHistoryClaims | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=ORDER_HISTORY_AUDIENCE,
        )
    except JWTError:
        return None

    if (
        payload.get("token_type") != ORDER_HISTORY_TOKEN_TYPE
        or payload.get("purpose") != ORDER_HISTORY_PURPOSE
    ):
        return None

    subject = payload.get("sub")
    order_number = payload.get("order_number")

    if not isinstance(subject, str) or not isinstance(order_number, str):
        return None

    try:
        canonical_phone = phone_identity(subject)
    except ValueError:
        return None

    if canonical_phone != subject:
        return None

    return OrderHistoryClaims(
        phone=canonical_phone,
        order_number=order_number,
    )


def get_order_history_claims(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> OrderHistoryClaims:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Order history access token missing",
            headers={
                "WWW-Authenticate": "Bearer",
                "Cache-Control": "no-store",
            },
        )

    claims = decode_order_history_token(credentials.credentials)
    if claims is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired order history access token",
            headers={
                "WWW-Authenticate": "Bearer",
                "Cache-Control": "no-store",
            },
        )

    return claims


def _get_admin_from_token(token: str, db: Session) -> Admin:
    subject = verify_token(
        token,
        expected_token_type=TOKEN_TYPE_ACCESS,
    )

    if subject is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        admin_id = int(subject)
    except (TypeError, ValueError):
        admin_id = None

    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if admin is None:
        raise HTTPException(
            status_code=401,
            detail="Admin account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Access token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _get_admin_from_token(credentials.credentials, db)


def get_optional_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None:
        if request.headers.get("Authorization") is None:
            return None

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _get_admin_from_token(credentials.credentials, db)
