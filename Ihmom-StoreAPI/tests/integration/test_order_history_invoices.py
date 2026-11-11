from copy import deepcopy
from datetime import timedelta

import pytest
from jose import jwt

from app.core.config import settings
from app.constants.auth import ORDER_HISTORY_AUDIENCE
from app.constants.auth import TOKEN_TYPE_ACCESS
from app.core.security import create_order_history_token, create_token
from tests.helpers import post_checkout


pytestmark = pytest.mark.integration


def _checkout(client, payload):
    response = post_checkout(client, payload)
    assert response.status_code == 201, response.text
    return response.json()


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_checkout_token_retrieves_only_verified_order(client, checkout_payload):
    first = _checkout(client, checkout_payload)
    second_payload = deepcopy(checkout_payload)
    second_payload["address"] = "Second address"
    second = _checkout(client, second_payload)
    history = client.get(
        "/orders/history", headers=_bearer(first["history_access_token"])
    )
    assert history.status_code == 200, history.text
    body = history.json()
    assert body["order_number"] == first["order_number"]
    assert body["order_number"] != second["order_number"]
    assert body["total_quantity"] == 2
    assert history.headers["cache-control"] == "no-store"


def test_history_verification_normalizes_phone_and_order_number(
    client, checkout_payload
):
    order = _checkout(client, checkout_payload)
    response = client.post(
        "/orders/history/verify",
        json={
            "phone": "970599123456",
            "order_number": f"  #{order['order_number']}  ",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["token_type"] == "Bearer"
    assert response.json()["expires_in"] > 0
    assert response.headers["cache-control"] == "no-store"
    assert client.get(
        "/orders/history", headers=_bearer(response.json()["access_token"])
    ).status_code == 200


def test_history_verification_uses_generic_failure_and_rejects_bad_input(
    client, checkout_payload
):
    order = _checkout(client, checkout_payload)
    wrong_phone = client.post(
        "/orders/history/verify",
        json={"phone": "0599000000", "order_number": order["order_number"]},
    )
    wrong_order = client.post(
        "/orders/history/verify",
        json={"phone": checkout_payload["customer_phone"], "order_number": "IHM-NOTFOUND"},
    )
    assert wrong_phone.status_code == wrong_order.status_code == 404
    assert wrong_phone.json() == wrong_order.json()
    assert "customer" not in wrong_phone.text.lower()
    assert client.post(
        "/orders/history/verify", json={"phone": "bad", "order_number": "x"}
    ).status_code == 422


@pytest.mark.security
def test_history_token_type_expiry_signature_and_scope(client, checkout_payload, admin):
    order = _checkout(client, checkout_payload)
    assert client.get("/orders/history").status_code == 401
    admin_access = create_token(
        {"sub": str(admin.id)}, timedelta(minutes=5), TOKEN_TYPE_ACCESS
    )
    assert client.get("/orders/history", headers=_bearer(admin_access)).status_code == 401
    expired = create_order_history_token(
        checkout_payload["customer_phone"], order["order_number"], timedelta(seconds=-1)
    )
    assert client.get("/orders/history", headers=_bearer(expired)).status_code == 401

    claims = jwt.decode(
        order["history_access_token"],
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience=ORDER_HISTORY_AUDIENCE,
    )
    claims["order_number"] = "IHM-FORGED"
    forged = jwt.encode(claims, "wrong-secret", algorithm=settings.ALGORITHM)
    assert client.get("/orders/history", headers=_bearer(forged)).status_code == 401


@pytest.mark.security
def test_order_history_verification_rate_limit(client, checkout_payload, monkeypatch):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_IP", 2)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 2)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 2)
    body = {"phone": checkout_payload["customer_phone"], "order_number": "IHM-INVALID"}
    assert client.post("/orders/history/verify", json=body).status_code == 404
    assert client.post("/orders/history/verify", json=body).status_code == 404
    limited = client.post("/orders/history/verify", json=body)
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) >= 1
    assert limited.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("language", ["en", "ar"])
def test_admin_invoice_is_valid_pdf_with_safe_headers(
    client, auth_headers, checkout_payload, language
):
    order = _checkout(client, checkout_payload)
    listing = client.get(
        "/orders/admin/all", headers=auth_headers, params={"search": order["order_number"]}
    ).json()
    order_id = listing["items"][0]["id"]
    response = client.get(
        f"/orders/admin/{order_id}/invoice",
        headers=auth_headers,
        params={"lang": language},
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["cache-control"] == "private, no-store"
    assert order["order_number"] in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    assert b"%%EOF" in response.content[-1024:]


def test_history_invoice_requires_matching_history_token(client, checkout_payload):
    order = _checkout(client, checkout_payload)
    response = client.get(
        "/orders/history/invoice",
        headers=_bearer(order["history_access_token"]),
        params={"language": "ar"},
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-")
    assert client.get("/orders/history/invoice").status_code == 401
    assert client.get(
        "/orders/history/invoice?lang=fr",
        headers=_bearer(order["history_access_token"]),
    ).status_code == 422


def test_admin_invoice_auth_and_missing_order(client, auth_headers):
    assert client.get("/orders/admin/999999/invoice", headers=auth_headers).status_code == 404
    assert client.get("/orders/admin/1/invoice").status_code == 401
