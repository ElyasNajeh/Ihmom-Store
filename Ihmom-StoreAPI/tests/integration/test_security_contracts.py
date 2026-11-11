from copy import deepcopy

import pytest
from redis.exceptions import RedisError

from app.core import rate_limit
from app.core.config import settings
from tests.helpers import post_checkout


pytestmark = [pytest.mark.integration, pytest.mark.security]


def _login(client, admin):
    return client.post(
        "/auth/login",
        json={"username": admin.username, "password": admin.plain_password},
    )


def test_rotated_refresh_token_replay_is_rejected_and_revokes_session(client, admin):
    login = _login(client, admin)
    assert login.status_code == 200
    original = client.cookies.get("refresh_token")
    assert original
    rotated = client.post("/auth/refresh")
    assert rotated.status_code == 200
    rotated_access = rotated.json()["access_token"]
    client.cookies.set("refresh_token", original, path="/auth")
    replay = client.post("/auth/refresh")
    assert replay.status_code == 401
    assert "replay" in replay.json()["detail"].lower()
    assert client.get(
        "/auth/me", headers={"Authorization": f"Bearer {rotated_access}"}
    ).status_code == 401


def test_logout_revokes_access_and_refresh_tokens_immediately(client, admin):
    login = _login(client, admin)
    access = login.json()["access_token"]
    refresh = client.cookies.get("refresh_token")
    assert client.post("/auth/logout").status_code == 200
    assert client.get(
        "/auth/me", headers={"Authorization": f"Bearer {access}"}
    ).status_code == 401
    client.cookies.set("refresh_token", refresh, path="/auth")
    assert client.post("/auth/refresh").status_code == 401


def test_login_rate_limit_per_account(client, admin):
    statuses = [
        client.post(
            "/auth/login",
            json={"username": admin.username, "password": f"wrong-{index}"},
        ).status_code
        for index in range(6)
    ]
    assert statuses == [401] * 5 + [429]
    assert int(client.post(
        "/auth/login",
        json={"username": admin.username, "password": "still-wrong"},
    ).headers["retry-after"]) >= 1


def test_login_rate_limit_per_ip(client, monkeypatch):
    monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_PER_IP", 2)
    statuses = [
        client.post(
            "/auth/login",
            json={"username": f"unknown-{index}", "password": "wrong-password"},
        ).status_code
        for index in range(3)
    ]
    assert statuses == [401, 401, 429]


def test_successful_login_resets_account_failure_counter(client, admin, monkeypatch):
    monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_PER_ACCOUNT", 2)
    assert client.post(
        "/auth/login",
        json={"username": admin.username, "password": "wrong-password"},
    ).status_code == 401
    assert _login(client, admin).status_code == 200
    statuses = [
        client.post(
            "/auth/login",
            json={"username": admin.username, "password": "wrong-password"},
        ).status_code
        for _ in range(3)
    ]
    assert statuses == [401, 401, 429]


def test_checkout_rate_limit_counts_unique_attempts(
    client, checkout_payload, monkeypatch
):
    monkeypatch.setattr(settings, "CHECKOUT_RATE_LIMIT_PER_IP", 2)
    payload = deepcopy(checkout_payload)
    payload["delivery_area_id"] = 999999999
    statuses = [post_checkout(client, payload).status_code for _ in range(3)]
    assert statuses == [422, 422, 429]


def test_checkout_rate_limit_allows_same_idempotency_key_retry(
    client, checkout_payload, monkeypatch
):
    monkeypatch.setattr(settings, "CHECKOUT_RATE_LIMIT_PER_IP", 1)
    payload = deepcopy(checkout_payload)
    payload["delivery_area_id"] = 999999999
    key = "a89e3d0c-99e0-451b-a32f-849415242516"
    assert post_checkout(client, payload, key).status_code == 422
    assert post_checkout(client, payload, key).status_code == 422


def test_redis_failure_fails_closed(client, admin, monkeypatch):
    async def unavailable(*args, **kwargs):
        raise RedisError("simulated outage")

    monkeypatch.setattr(rate_limit.redis_client, "eval", unavailable)
    response = _login(client, admin)
    assert response.status_code == 503
    assert response.headers["retry-after"] == "5"


def test_cors_allows_configured_origin_and_rejects_other_origin(client):
    allowed = client.options(
        "/auth/refresh",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert allowed.headers["access-control-allow-credentials"] == "true"
    denied = client.options(
        "/auth/refresh",
        headers={
            "Origin": "https://attacker.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_malformed_json_and_sql_injection_are_handled(client, auth_headers):
    malformed = client.post(
        "/orders/checkout",
        content=b'{"items": [}',
        headers={"Content-Type": "application/json"},
    )
    assert malformed.status_code == 422
    for payload in ("' OR 1=1 --", "%' UNION SELECT current_user --"):
        response = client.get(
            "/orders/admin/all", headers=auth_headers, params={"search": payload}
        )
        assert response.status_code == 200
        assert response.json()["items"] == []


def test_sensitive_fields_and_secrets_are_not_exposed(client, auth_headers, admin):
    profile = client.get("/auth/me", headers=auth_headers)
    listing = client.get("/admins/", headers=auth_headers)
    combined = profile.text + listing.text + client.get("/openapi.json").text
    assert "hashed_password" not in combined
    assert admin.plain_password not in combined
    assert "test-only-secret-key" not in combined


def test_security_headers_on_token_responses(client, admin):
    login = _login(client, admin)
    cookie = login.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=strict" in cookie
    assert "path=/auth" in cookie
    assert login.headers["cache-control"] == "no-store"
    assert login.headers["pragma"] == "no-cache"
    refresh = client.post("/auth/refresh")
    assert refresh.status_code == 200
    assert refresh.headers["cache-control"] == "no-store"
    assert refresh.headers["pragma"] == "no-cache"
