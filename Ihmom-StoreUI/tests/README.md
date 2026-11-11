# Frontend regression tests

Run commands from `Ihmom-StoreUI` in Windows PowerShell. The `.cmd` suffix
avoids PowerShell execution-policy restrictions on npm scripts.

```powershell
npm.cmd ci
npm.cmd test
npx.cmd tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
```

Browser tests require the Python backend test dependencies and isolated
PostgreSQL/Redis services. Start only the test Compose project:

```powershell
docker compose -f ../Ihmom-StoreAPI/tests/docker-compose.test.yml up -d --wait
python -m pip install -r ../Ihmom-StoreAPI/requirements.txt -r ../Ihmom-StoreAPI/requirements-dev.txt
npx.cmd playwright install chromium
npm.cmd run test:browser -- --reporter=line
docker compose -f ../Ihmom-StoreAPI/tests/docker-compose.test.yml down
```

Playwright starts Vite on `127.0.0.1:4173` and a real FastAPI fixture on
`127.0.0.1:18080`. The fixture hardcodes only the disposable `ihmom_store_test`
database on port 55432 and Redis database 15 on port 57279. It applies migrations
and creates test-only admin/catalog records there. Never point it at another
database. Test credentials exist only in this fixture. The test Compose services
use tmpfs and do not mount development or production volumes.

Run backend tests in a fresh disposable environment after browser testing,
because browser tests deliberately commit their fixture and order records.
Stop the test project and start it again to obtain an empty tmpfs database.
Never use `down -v`.

`tests/unit` contains DOM/component, schema, error, and Axios adapter tests.
`tests/browser` contains Chromium tests with real backend calls, responsive
checks, form saves, and an intentionally lost checkout response followed by an
idempotent retry. Only the shop error/empty-state test stubs catalog responses.
See `FRONTEND_TEST_REPORT.md` for measured results and limitations.
