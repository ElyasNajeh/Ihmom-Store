from datetime import timedelta

import pytest
from fastapi import HTTPException, Request, Response
from jose import jwt

from app.constants.auth import TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH
from app.core.config import settings
from app.core.security import (
    create_order_history_token,
    create_token,
    decode_order_history_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.features.auth import service as auth_service


pytestmark = [pytest.mark.unit, pytest.mark.security]


def make_request(origin: str | None = None) -> Request:
    headers = [] if origin is None else [(b"origin", origin.encode())]
    return Request({"type": "http", "method": "POST", "path": "/", "headers": headers})


def test_password_hash_is_salted_and_verifies():
    first = hash_password("correct horse battery staple")
    second = hash_password("correct horse battery staple")
    assert first != second
    assert "correct horse battery staple" not in first
    assert verify_password("correct horse battery staple", first)
    assert not verify_password("wrong", first)
    assert not verify_password("anything", "not-a-bcrypt-hash")


def test_access_and_refresh_tokens_are_not_interchangeable():
    access = create_token({"sub": "7"}, timedelta(minutes=5), TOKEN_TYPE_ACCESS)
    refresh = create_token({"sub": "7"}, timedelta(minutes=5), TOKEN_TYPE_REFRESH)
    assert verify_token(access, TOKEN_TYPE_ACCESS) == "7"
    assert verify_token(access, TOKEN_TYPE_REFRESH) is None
    assert verify_token(refresh, TOKEN_TYPE_ACCESS) is None


def test_expired_and_wrong_signature_tokens_are_rejected():
    expired = create_token({"sub": "7"}, timedelta(seconds=-1), TOKEN_TYPE_ACCESS)
    forged = jwt.encode(
        {"sub": "7", "token_type": TOKEN_TYPE_ACCESS},
        "wrong-secret",
        algorithm=settings.ALGORITHM,
    )
    assert verify_token(expired, TOKEN_TYPE_ACCESS) is None
    assert verify_token(forged, TOKEN_TYPE_ACCESS) is None


def test_order_history_token_has_dedicated_scope_and_canonical_phone():
    token = create_order_history_token("0599123456", "IHM-test", timedelta(minutes=5))
    claims = decode_order_history_token(token)
    assert claims is not None
    assert claims.phone == "+970599123456"
    assert claims.order_number == "IHM-test"
    assert verify_token(token, TOKEN_TYPE_ACCESS) is None


def test_order_history_rejects_noncanonical_subject_and_wrong_audience():
    valid = create_order_history_token("0599123456", "IHM-test", timedelta(minutes=5))
    payload = jwt.decode(
        valid,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience="order-history",
    )
    payload["sub"] = "0599123456"
    noncanonical = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    payload["sub"] = "+970599123456"
    payload["aud"] = "admin"
    wrong_audience = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    assert decode_order_history_token(noncanonical) is None
    assert decode_order_history_token(wrong_audience) is None


@pytest.mark.parametrize(
    ("origin", "allowed"),
    [
        (None, True),
        ("http://localhost:5173", True),
        ("http://localhost:5173/", True),
        ("https://evil.example", False),
        ("http://localhost:5173.evil.example", False),
    ],
)
def test_cookie_request_origin_is_exactly_allowlisted(origin, allowed):
    if allowed:
        auth_service._validate_cookie_request_origin(make_request(origin))
    else:
        with pytest.raises(HTTPException) as exc:
            auth_service._validate_cookie_request_origin(make_request(origin))
        assert exc.value.status_code == 403


def test_refresh_cookie_has_security_attributes(monkeypatch):
    response = Response()
    monkeypatch.setattr(settings, "COOKIE_SECURE", True)
    monkeypatch.setattr(settings, "COOKIE_SAMESITE", "strict")
    auth_service._set_refresh_cookie(response, "secret-token")
    header = response.headers["set-cookie"]
    assert "HttpOnly" in header
    assert "Secure" in header
    assert "SameSite=strict" in header
    assert "Path=/auth" in header
    assert "secret-token" in header


def test_logout_cookie_uses_same_scope_as_login_cookie():
    response = Response()
    auth_service._clear_refresh_cookie(response)
    header = response.headers["set-cookie"]
    assert "refresh_token=" in header
    assert "Path=/auth" in header
    assert "HttpOnly" in header
