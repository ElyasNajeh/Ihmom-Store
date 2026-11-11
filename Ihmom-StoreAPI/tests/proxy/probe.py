"""Test-only wrapper; mounted solely into the disposable proxy API container."""

from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.rate_limit import client_ip
from app.main import app as application


async def app(scope, receive, send):
    if scope["type"] == "http" and scope["path"] in {"/__proxy_probe", "/uploads/__proxy_probe"}:
        request = Request(scope)
        response = JSONResponse({
            "ip": client_ip(request),
            "scheme": request.url.scheme,
            "xff": request.headers.get("x-forwarded-for"),
            "real_ip": request.headers.get("x-real-ip"),
            "forwarded": request.headers.get("forwarded"),
        })
        await response(scope, receive, send)
        return
    await application(scope, receive, send)
