"""Real TCP traffic through two Nginx instances, Uvicorn and Redis.

Only a test-specific loopback port is published; no application volumes or
existing Docker services are used.
The module fixture removes only its explicitly named disposable project.
"""

import json
import os
from pathlib import Path
import subprocess
import urllib.request
from uuid import uuid4

import pytest


pytestmark = [pytest.mark.proxy, pytest.mark.security]
ROOT = Path(__file__).resolve().parents[3]
COMPOSE = [
    "docker", "compose", "--env-file", str(ROOT / ".env.example"),
    "-f", str(Path(__file__).with_name("docker-compose.yml")),
]


def compose(*args, input=None, timeout=120):
    result = subprocess.run(
        [*COMPOSE, *args], input=input, text=True, encoding="utf-8", errors="replace",
        capture_output=True, timeout=timeout,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return result.stdout


@pytest.fixture(scope="module", autouse=True)
def proxy_stack():
    # Refuse to adopt a previously running project or remove pre-existing data.
    assert not compose("ps", "--all", "--quiet").strip(), "Proxy test project already exists"
    try:
        compose("up", "-d", "--build", "--wait", timeout=600)
        yield
    finally:
        compose("down", "--timeout", "10")


def request(client="client-a", target="edge", path="/api/__proxy_probe", headers=None, usernames=None):
    # JSON goes through stdin, never through a shell or a command interpolation.
    script = """
import json, sys, urllib.request, urllib.error
options = json.load(sys.stdin)
results = []
for username in options['usernames'] or [None]:
    payload = None if username is None else json.dumps({'username': username, 'password': 'wrong-password'}).encode()
    headers = {'Content-Type': 'application/json', **options['headers']}
    req = urllib.request.Request(options['url'], data=payload, headers=headers)
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        results.append({'status': response.status, 'headers': {k.lower(): v for k, v in response.headers.items()}, 'body': json.load(response)})
print(json.dumps(results))
"""
    return json.loads(compose(
        "exec", "-T", client, "python", "-c", script,
        input=json.dumps({
            "url": f"http://{target}{path}", "headers": headers or {}, "usernames": usernames,
        }),
    ))


def clear_counters():
    # This Redis exists only inside this disposable project and has no volume.
    assert "OK" in compose("exec", "-T", "redis", "redis-cli", "-n", "15", "FLUSHDB")


@pytest.mark.parametrize("client, expected", [("client-a", "172.30.253.5"), ("client-b", "172.30.253.6")])
@pytest.mark.parametrize("path", ["/api/__proxy_probe", "/uploads/__proxy_probe"])
def test_both_nginx_layers_preserve_real_ip_and_discard_spoofed_headers(client, expected, path):
    response = request(client=client, path=path, headers={
        "X-Forwarded-For": "198.51.100.88, 203.0.113.99",
        "X-Real-IP": "198.51.100.88", "X-Forwarded-Proto": "https",
        "Forwarded": 'for=198.51.100.88;proto=https',
    })[0]
    assert response["status"] == 200
    assert response["body"] == {
        "ip": expected, "scheme": "http", "xff": expected, "real_ip": expected, "forwarded": None,
    }


@pytest.mark.parametrize("target, path", [("ui", "/api/__proxy_probe"), ("api:8000", "/__proxy_probe")])
def test_bypassing_either_proxy_cannot_spoof_client_identity(target, path):
    response = request(target=target, path=path, headers={
        "X-Forwarded-For": "198.51.100.88", "X-Real-IP": "198.51.100.88",
        "X-Forwarded-Proto": "https",
    })[0]
    assert response["status"] == 200
    assert response["body"]["ip"] == "172.30.253.5"
    assert response["body"]["scheme"] == "http"


def test_trusted_edge_preserves_https_and_ipv6_client():
    body = json.loads(compose(
        "exec", "-T", "edge", "wget", "-q", "-O", "-",
        "--header=X-Forwarded-For: 2001:db8::123", "--header=X-Forwarded-Proto: https",
        "http://ui/api/__proxy_probe",
    ))
    assert body["ip"] == "2001:db8::123"
    assert body["scheme"] == "https"
    assert body["real_ip"] == body["xff"] == "2001:db8::123"


def test_host_published_port_uses_only_the_configured_gateway_trust():
    req = urllib.request.Request("http://127.0.0.1:58374/api/__proxy_probe", headers={
        "X-Forwarded-For": "198.51.100.20", "X-Forwarded-Proto": "https",
    })
    with urllib.request.urlopen(req, timeout=10) as response:
        body = json.load(response)
    assert body["ip"] == "198.51.100.20"
    assert body["scheme"] == "https"
    bypass = request(target="ui-host", headers={
        "X-Forwarded-For": "198.51.100.20", "X-Forwarded-Proto": "https",
    })[0]
    assert bypass["body"]["ip"] == "172.30.253.5"
    assert bypass["body"]["scheme"] == "http"


def test_production_ui_image_serves_the_built_storefront_and_spa_routes():
    for path in ("/", "/admin/login"):
        with urllib.request.urlopen(f"http://127.0.0.1:58374{path}", timeout=10) as response:
            assert response.status == 200
            assert response.headers.get_content_type() == "text/html"
            assert 'id="root"' in response.read().decode("utf-8")


def test_redis_ip_limit_is_separate_for_two_real_clients():
    clear_counters()
    prefix = uuid4().hex[:12]
    responses = request(path="/api/auth/login", usernames=[f"{prefix}-{i}" for i in range(21)])
    assert [r["status"] for r in responses] == [401] * 20 + [429]
    assert int(responses[-1]["headers"]["retry-after"]) > 0
    other = request(client="client-b", path="/api/auth/login", usernames=[prefix + "-other"])[0]
    assert other["status"] == 401
    forged = request(path="/api/auth/login", usernames=[prefix + "-spoof"], headers={
        "X-Forwarded-For": "198.51.100.88", "X-Real-IP": "198.51.100.88",
    })[0]
    assert forged["status"] == 429


def test_redis_account_limit_still_applies_across_different_clients():
    clear_counters()
    username = "absent-" + uuid4().hex[:12]
    first = request(path="/api/auth/login", usernames=[username] * 3)
    second = request(client="client-b", path="/api/auth/login", usernames=[username] * 3)
    assert [r["status"] for r in first + second] == [401] * 5 + [429]


def test_production_compose_has_exact_proxy_trust_and_preserves_vps_bindings():
    env = {**os.environ, "VITE_API_URL": "/api"}
    result = subprocess.run([
        "docker", "compose", "--env-file", str(ROOT / ".env.example"),
        "-f", str(ROOT / "docker-compose.prod.yml"), "config", "--no-env-resolution", "--format", "json",
    ], text=True, encoding="utf-8", capture_output=True, env=env, timeout=30)
    assert result.returncode == 0, result.stderr
    config = json.loads(result.stdout)
    api, ui = config["services"]["api"], config["services"]["ui"]
    assert "--proxy-headers --forwarded-allow-ips 172.30.254.3" in api["command"][-1]
    assert api["networks"]["proxy"]["ipv4_address"] == "172.30.254.2"
    assert ui["networks"]["proxy"]["ipv4_address"] == "172.30.254.3"
    assert set(ui["networks"]) == {"proxy"}
    assert ui["environment"]["TRUSTED_EDGE_PROXY_IP"] == "172.30.254.1"
    assert ui["ports"][0]["host_ip"] == api["ports"][0]["host_ip"] == "127.0.0.1"
    assert str(ui["ports"][0]["published"]) == "5174"
    assert str(api["ports"][0]["published"]) == "8001"
    assert "ports" not in config["services"]["redis"]
    assert set(config["volumes"]) == {"postgres_data", "uploads_data"}
    assert config["name"] == "ihmom-store"
    assert {name for name, service in config["services"].items() if "proxy" in service["networks"]} == {"api", "ui"}
    assert config["networks"]["proxy"]["ipam"]["config"] == [{
        "subnet": "172.30.254.0/29", "gateway": "172.30.254.1",
    }]
