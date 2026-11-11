from decimal import Decimal

import pytest

from tests.helpers import post_checkout


pytestmark = pytest.mark.integration


def _checkout(client, payload):
    response = post_checkout(client, payload)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize(
    ("period", "granularity", "points"),
    [
        ("day", "hour", 24),
        ("week", "day", 7),
        ("month", "day", 30),
        ("year", "month", 12),
    ],
)
def test_empty_dashboard_period_shapes(client, auth_headers, period, granularity, points):
    response = client.get(
        "/dashboard/stats", headers=auth_headers, params={"period": period}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total_orders"] == 0
    assert Decimal(body["total_order_value"]) == Decimal("0")
    assert body["series_granularity"] == granularity
    assert len(body["series"]) == points
    assert all(point["orders"] == 0 for point in body["series"])


def test_dashboard_counts_revenue_statuses_and_recent_orders(
    client, auth_headers, checkout_payload
):
    first = _checkout(client, checkout_payload)
    second = _checkout(client, checkout_payload)
    listing = client.get("/orders/admin/all", headers=auth_headers).json()["items"]
    by_number = {item["order_number"]: item for item in listing}
    assert client.patch(
        f"/orders/admin/{by_number[first['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "confirmed"},
    ).status_code == 200
    assert client.patch(
        f"/orders/admin/{by_number[first['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "out_for_delivery"},
    ).status_code == 200
    assert client.patch(
        f"/orders/admin/{by_number[first['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "delivered"},
    ).status_code == 200
    assert client.patch(
        f"/orders/admin/{by_number[second['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "cancelled"},
    ).status_code == 200

    stats = client.get(
        "/dashboard/stats", headers=auth_headers, params={"period": "all"}
    ).json()
    assert stats["total_orders"] == 2
    assert stats["delivered_orders"] == 1
    assert stats["cancelled_orders"] == 1
    assert Decimal(stats["delivered_revenue"]) == Decimal("25.45")
    assert Decimal(stats["cancelled_order_value"]) == Decimal("25.45")
    assert Decimal(stats["total_order_value"]) == Decimal("50.90")
    assert sum(point["orders"] for point in stats["series"]) == 2
    assert len(stats["recent_orders"]) == 2


def test_dashboard_requires_admin_and_valid_period(client, auth_headers):
    assert client.get("/dashboard/stats").status_code == 401
    assert client.get(
        "/dashboard/stats", headers=auth_headers, params={"period": "quarter"}
    ).status_code == 422
