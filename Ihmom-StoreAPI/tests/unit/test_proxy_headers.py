import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.rate_limit import client_ip


pytestmark = [pytest.mark.unit, pytest.mark.security]


@pytest.mark.parametrize(
    ("peer", "headers", "expected_ip", "expected_scheme"),
    [
        ("172.30.254.3", {"X-Forwarded-For": "198.51.100.10", "X-Forwarded-Proto": "https"}, "198.51.100.10", "https"),
        ("172.30.254.4", {"X-Forwarded-For": "198.51.100.10", "X-Forwarded-Proto": "https"}, "172.30.254.4", "http"),
        ("127.0.0.1", {"X-Forwarded-For": "198.51.100.10", "X-Forwarded-Proto": "https"}, "127.0.0.1", "http"),
        ("172.30.254.3", {}, "172.30.254.3", "http"),
        ("172.30.254.3", {"X-Forwarded-For": "2001:db8::123", "X-Forwarded-Proto": "https"}, "2001:db8::123", "https"),
        ("172.30.254.3", {"X-Forwarded-For": "198.51.100.99, 198.51.100.10"}, "198.51.100.10", "http"),
    ],
)
def test_only_exact_ui_proxy_can_change_asgi_client(peer, headers, expected_ip, expected_scheme):
    probe = FastAPI()

    @probe.get("/")
    def address(request: Request):
        return {"ip": client_ip(request), "scheme": request.url.scheme}

    wrapped = ProxyHeadersMiddleware(probe, trusted_hosts="172.30.254.3")
    with TestClient(wrapped, client=(peer, 12345)) as client:
        response = client.get("/", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"ip": expected_ip, "scheme": expected_scheme}
