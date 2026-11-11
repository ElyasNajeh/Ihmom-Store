from datetime import timedelta
from uuid import uuid4

import pytest

from app.constants.auth import TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH
from app.core.security import create_token
from app.features.admins.model import Admin


pytestmark = pytest.mark.integration


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoints_do_not_require_database_auth(client):
    root = client.get("/")
    health = client.get("/health")
    assert root.status_code == 200
    assert root.json()["message"].endswith("is running")
    assert health.status_code == 200
    assert health.json() == {"status": "healthy"}


@pytest.mark.security
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/admins/"),
        ("get", "/customers/"),
        ("get", "/orders/admin/all"),
        ("get", "/dashboard/stats"),
        ("post", "/brands/"),
        ("post", "/categories/"),
        ("post", "/products/"),
    ],
)
def test_protected_endpoints_reject_missing_token(client, method, path):
    if method == "post":
        response = client.post(path, json={})
    else:
        response = client.get(path)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_me_refresh_and_logout_flow(client, admin):
    login = client.post(
        "/auth/login",
        json={"username": f"  {admin.username}  ", "password": admin.plain_password},
    )
    assert login.status_code == 200
    body = login.json()
    assert body["username"] == admin.username
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    cookie = login.headers["set-cookie"]
    assert "HttpOnly" in cookie and "Path=/auth" in cookie and "SameSite=strict" in cookie
    assert "refresh_token" not in body

    me = client.get("/auth/me", headers=bearer(body["access_token"]))
    assert me.status_code == 200
    assert me.json() == {"id": admin.id, "username": admin.username, "email": admin.email}

    refresh = client.post(
        "/auth/refresh",
        headers={"Origin": "http://localhost:5173"},
    )
    assert refresh.status_code == 200
    assert refresh.json()["access_token"] != body["access_token"]

    logout = client.post("/auth/logout", headers={"Origin": "http://localhost:5173"})
    assert logout.status_code == 200
    assert "Max-Age=0" in logout.headers["set-cookie"]


@pytest.mark.parametrize(
    "payload",
    [
        {"username": "missing", "password": "wrong"},
        {"username": "", "password": "wrong"},
        {"username": "admin", "password": ""},
        {"username": "admin"},
    ],
)
def test_login_failure_and_validation_do_not_disclose_accounts(client, payload):
    response = client.post("/auth/login", json=payload)
    assert response.status_code in {401, 422}
    assert "hashed_password" not in response.text


@pytest.mark.security
def test_access_refresh_and_history_token_types_cannot_cross_boundaries(client, admin):
    access = create_token({"sub": str(admin.id)}, timedelta(minutes=5), TOKEN_TYPE_ACCESS)
    refresh = create_token({"sub": str(admin.id)}, timedelta(minutes=5), TOKEN_TYPE_REFRESH)
    client.cookies.set("refresh_token", access, path="/auth")
    assert client.post("/auth/refresh").status_code == 401
    assert client.get("/auth/me", headers=bearer(refresh)).status_code == 401


def test_refresh_rejects_missing_cookie_and_hostile_origin(client):
    client.cookies.clear()
    assert client.post("/auth/refresh").status_code == 401
    hostile = client.post("/auth/logout", headers={"Origin": "https://evil.example"})
    assert hostile.status_code == 403


def test_deleted_admin_token_is_rejected(client, admin, db_session):
    login = client.post(
        "/auth/login",
        json={"username": admin.username, "password": admin.plain_password},
    )
    token = login.json()["access_token"]
    db_session.delete(admin)
    db_session.commit()
    response = client.get("/auth/me", headers=bearer(token))
    assert response.status_code == 401
    assert "session" in response.json()["detail"].lower()


def test_multiple_admin_sessions_are_independent(client, admin):
    first = client.post(
        "/auth/login",
        json={"username": admin.username, "password": admin.plain_password},
    )
    first_access = first.json()["access_token"]
    second = client.post(
        "/auth/login",
        json={"username": admin.username, "password": admin.plain_password},
    )
    second_access = second.json()["access_token"]
    assert client.post("/auth/logout").status_code == 200
    assert client.get("/auth/me", headers=bearer(second_access)).status_code == 401
    assert client.get("/auth/me", headers=bearer(first_access)).status_code == 200


def test_create_list_get_and_delete_admin(client, auth_headers, db_session):
    username = f"second-{uuid4().hex[:8]}"
    created = client.post(
        "/admins/",
        headers=auth_headers,
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "Another-password-123!",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["username"] == username
    assert "password" not in body and "hashed_password" not in body

    listing = client.get("/admins/", headers=auth_headers, params={"search": username})
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()["items"]] == [body["id"]]
    assert client.get(f"/admins/{body['id']}", headers=auth_headers).status_code == 200
    assert client.delete(f"/admins/{body['id']}", headers=auth_headers).status_code == 204
    assert db_session.get(Admin, body["id"]) is None


def test_duplicate_admin_username_and_case_normalized_email_conflict(client, auth_headers):
    first = {
        "username": f"duplicate-{uuid4().hex[:8]}",
        "email": f"{uuid4().hex}@example.com",
        "password": "password123",
    }
    assert client.post("/admins/", headers=auth_headers, json=first).status_code == 201
    duplicate_username = {**first, "email": f"{uuid4().hex}@example.com"}
    duplicate_email = {**first, "username": f"other-{uuid4().hex[:8]}", "email": first["email"].upper()}
    assert client.post("/admins/", headers=auth_headers, json=duplicate_username).status_code == 409
    assert client.post("/admins/", headers=auth_headers, json=duplicate_email).status_code == 409


def test_admin_cannot_delete_self(client, auth_headers, admin):
    response = client.delete(f"/admins/{admin.id}", headers=auth_headers)
    assert response.status_code == 409
    assert "own accounts" in response.json()["detail"]


@pytest.mark.parametrize("query", ["unknown=x", "page=1&page=2"])
def test_unknown_and_duplicate_query_parameters_are_rejected(
    client, auth_headers, query
):
    assert client.get(f"/admins/?{query}", headers=auth_headers).status_code == 422


def test_admin_page_size_is_capped_at_documented_global_limit(client, auth_headers):
    """Regression: admin list currently omits the global page-size upper bound."""
    response = client.get("/admins/", headers=auth_headers, params={"page_size": 101})
    assert response.status_code == 422
