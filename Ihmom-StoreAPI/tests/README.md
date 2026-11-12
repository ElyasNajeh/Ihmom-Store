# Backend test suite

Owner-notification regressions are in `unit/test_notifications.py` and
`integration/test_notifications.py`, with shared fictitious credentials/signing
helpers in `notification_helpers.py`. All Bird HTTP must use mock transports;
the test guard rejects accidental real requests. Proxy tests also start the
production worker with notifications disabled. See the
[notification operations guide](../docs/BIRD_NOTIFICATIONS.md) for setup and commands.

The suite is intentionally isolated from application data. Its disposable
services are defined in `tests/docker-compose.test.yml`:

- PostgreSQL: `127.0.0.1:55432`, database `ihmom_store_test`, tmpfs storage.
- Redis: `127.0.0.1:57279`, database 15, persistence disabled, tmpfs storage.

Neither service uses the application's persistent Docker volumes. Tests refuse
database names that do not end in `_test`, flush only Redis database 15, and
redirect uploads to a process-specific temporary directory before importing
the application.

## Windows PowerShell

Run these commands from `Ihmom-StoreAPI`:

```powershell
docker compose -f tests/docker-compose.test.yml up -d --wait
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m pytest
```

Useful selections:

```powershell
python -m pytest tests/unit
python -m pytest tests/integration
python -m pytest tests/e2e
python -m pytest tests/integration/test_checkout_orders.py
python -m pytest tests/integration/test_checkout_orders.py::test_same_idempotency_key_returns_original_order
python -m pytest --cov=app --cov-branch --cov-report=term-missing
```

`tests/proxy` additionally builds the production API/UI images and exercises
two real Nginx proxies, Uvicorn's trust allowlist, header spoofing, Docker's
host-loopback gateway, and per-IP/per-account Redis login limits. It owns and
automatically removes a separate disposable Docker project. Run it with:

```powershell
python -m pytest tests/unit/test_proxy_headers.py tests/proxy -v
```

Docker access is required for this module; use `-m "not proxy"` when deliberately
running only in-process tests. See [proxy deployment and regression instructions](../../deploy/PROXY_DEPLOYMENT.md)
for network/port requirements and safe recovery after an interrupted test run.
Current proxy verification results are in [PROXY_RATE_LIMIT_REPORT.md](PROXY_RATE_LIMIT_REPORT.md).

Stop only the disposable environment; do not add `-v`:

```powershell
docker compose -f tests/docker-compose.test.yml down
```

Checkout idempotency keys are retained for the lifetime of their order. A
retry with the same normalized payload returns that order, while a different
payload receives `409 Conflict`. Redis is required at startup and rate-limit
checks fail closed with `503` if it becomes unavailable. See the repository's
`CLEANUP_REPORT.md` for the current verification results and limitations.

Seed-specific tests have been retired with the removed seed utilities. Dashboard,
order-number, monetary and date-bucket tests remain in `test_dashboard.py` and
`test_order_dashboard.py` in their original integration/unit directories.

Category coverage now verifies the single `image` field, WebP replacement,
deletion, authentication and rollback cleanup. Migration tests create legacy
image records before upgrading, verify deterministic selection and preservation
of every archived association, downgrade, re-upgrade and check schema drift.
Guest history limits are tested against Redis, including concurrent attempts,
expiration, phone/IP/global limits and fail-closed outages. See
`REFACTORING_REPORT.md` for the current execution results.
