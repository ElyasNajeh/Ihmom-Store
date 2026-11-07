# Ihmom Store API

FastAPI backend for the Ihmom Store catalog, guest checkout, order administration, and dashboard. It uses synchronous SQLAlchemy sessions, PostgreSQL 17, Alembic migrations, JWT admin authentication, and filesystem-backed WebP uploads.

## Features

- Public active sliders, categories, brands, delivery areas, and products
- Simple products and products with selectable variants
- Optimized product and slider image uploads
- Guest cash-on-delivery checkout and phone-based order history
- Admin management and JWT authentication
- Admin CRUD for store content, customers, delivery areas, and products
- Order search, filtering, status workflow, item details, and PDF invoices
- Dashboard counts, order values, delivered revenue, and recent orders
- Consistent SQL-level search, filtering, sorting, and pagination

Detailed contracts are in [docs/API_REFERENCE.md](docs/API_REFERENCE.md). See [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) for internals and [docs/FRONTEND_INTEGRATION.md](docs/FRONTEND_INTEGRATION.md) for React/TypeScript usage.

## Technology

- Python 3.13
- FastAPI and Pydantic 2
- SQLAlchemy 2 with psycopg2
- PostgreSQL 17
- Alembic
- python-jose JWTs and bcrypt password hashes
- Pillow/pillow-heif image processing
- ReportLab invoices localized in English and Arabic (arabic-reshaper, python-bidi)

## Structure

```text
Ihmom-StoreAPI/
├── app/
│   ├── core/             # Settings and security dependencies
│   ├── db/               # Base, session, admin bootstrap, and static seed
│   ├── features/         # Feature-local model/schema/service/router modules
│   ├── shared/           # Pagination, CRUD, image, and phone utilities
│   └── main.py           # FastAPI setup and router registration
├── alembic/              # Migration environment and revisions
├── docs/                 # Architecture, API, and integration guides
├── tests/                # Pytest security and regression tests
├── Dockerfile            # Development image
├── Dockerfile.prod       # Production image
├── requirements-dev.txt  # Test dependencies
└── requirements.txt
```

The feature structure intentionally stays small: routers handle HTTP concerns, schemas validate contracts, services implement queries and transactions, and models define persistence.

## Prerequisites

The supported path is Docker Engine with Docker Compose. For a native run, install Python 3.13, PostgreSQL 17, system fonts usable by ReportLab, and the packages in `requirements.txt`.

## Configuration

Settings are read from environment variables or `.env` in the repository root/backend parent. Copy the repository `.env.example`; never commit the resulting `.env`.

| Variable | Purpose | Typical development value |
| --- | --- | --- |
| `APP_NAME` | OpenAPI title and root message | `Ihmom Store API` |
| `DATABASE_HOST` | PostgreSQL hostname | `postgres` in Compose |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_USER` | Database role | project-specific |
| `DATABASE_PASSWORD` | Database password | strong secret |
| `DATABASE_NAME` | Database name | `ihmom_store` |
| `SECRET_KEY` | HMAC JWT signing key | long cryptographically random secret |
| `ALGORITHM` | JWT algorithm | `HS256`, `HS384`, or `HS512` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh-token/cookie lifetime | `7` |
| `ORDER_HISTORY_TOKEN_EXPIRE_MINUTES` | Guest order-history token lifetime | `10` |
| `ORDER_HISTORY_RATE_WINDOW_SECONDS` | Fixed rate-limit window | `300` |
| `ORDER_HISTORY_RATE_LIMIT_PER_IP` | Verification attempts per IP per window | `10` |
| `ORDER_HISTORY_RATE_LIMIT_PER_PHONE` | Verification attempts per normalized phone per window | `5` |
| `ORDER_HISTORY_RATE_LIMIT_GLOBAL` | Verification attempts for all clients per window | `500` |
| `CORS_ORIGINS` | Exact comma-separated browser origins | `http://localhost:5173` |
| `COOKIE_SECURE` | Send refresh cookie only over HTTPS | `false` locally, `true` in production |
| `COOKIE_SAMESITE` | Refresh-cookie SameSite policy | `strict` |
| `UPLOAD_ROOT` | Persistent upload directory | `/app/uploads` |

`COOKIE_SAMESITE=none` is valid only with HTTPS and `COOKIE_SECURE=true`. Because credentialed CORS is enabled, list exact trusted origins; do not use a wildcard.

## Docker development

From the repository root:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api python -m app.db.create_admin
```

The admin command prompts for username, email, and a hidden password. There are no default credentials. Compose waits for PostgreSQL, runs `python -m alembic upgrade head`, and starts Uvicorn with reload. Source is bind-mounted; database rows and `/app/uploads` use named volumes.

API resources:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI: `http://localhost:8000/openapi.json`
- Health: `http://localhost:8000/health`

The health endpoint proves that the API process is responding; it is not a database readiness probe.

## Native development

Create an isolated environment, install dependencies, set every required environment variable, then run:

```bash
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
python -m app.db.create_admin
```

Run these commands with `Ihmom-StoreAPI` as the working directory. `UPLOAD_ROOT` must be writable.

## Static seed data

`app/db/seed.py` inserts the static catalog defined in `app/db/seed_data.py` through the feature services, so schema validation, SKU rules, and product variant handling stay consistent with the API. It is idempotent: reference records are matched by Arabic or English name, and products by English name and brand.

From the repository root:

```bash
npm run seed
```

Or inside the API environment:

```bash
python -m app.db.seed
```

The seed covers categories, brands, delivery areas, and simple or multi-variant products. Slider images are not seeded because they require real uploaded files; manage sliders from the dashboard. Edit `seed_data.py` to add records and run the command again; existing records are never updated or deleted.

## Migrations

Inspect the current state and schema drift with:

```bash
python -m alembic current
python -m alembic check
```

Apply committed migrations with `python -m alembic upgrade head`. Generate a migration only after deliberately changing a model, inspect the generated operations, test upgrade/downgrade on a disposable database, and then commit it. Never run downgrade or destructive migration experiments against shared or production data. Containers intentionally stop if migration startup fails.

## Authentication

`POST /auth/login` returns a short-lived access JWT in JSON and sets the refresh JWT as an `HttpOnly` cookie scoped to `/auth`. Send the access token as `Authorization: Bearer <token>`. `POST /auth/refresh` rotates the cookie and returns a new access token; `POST /auth/logout` clears it. Browser refresh/logout calls must include credentials.

Tokens contain distinct `access`/`refresh` types and cannot be interchanged. The API verifies that the referenced administrator still exists. Refresh JWTs are stateless: without an approved token store, logout cannot invalidate a copied token before expiry. See the architecture/security notes for the deployment implications.

## Uploads and invoices

Product and slider uploads are decoded as images, orientation-corrected, resized, converted atomically to WebP, and served below `/uploads`. Persist `UPLOAD_ROOT` in production. Do not trust the original file name. Invalid, empty, corrupted, or Pillow-unsafe images return `400`.

Invoice generation requires a Unicode font covering both Latin and Arabic scripts. The provided images install DejaVu fonts. Both invoice endpoints accept `lang=en|ar` (default `en`) and mirror the order fields shown in the storefront and admin UI. A missing compatible font produces a sanitized `500` response.

## Production checklist

- Use unique high-entropy `SECRET_KEY` and database credentials from a secret manager.
- Terminate HTTPS at a trusted reverse proxy; set `COOKIE_SECURE=true`.
- Set exact production `CORS_ORIGINS` and an appropriate `COOKIE_SAMESITE` value.
- Keep PostgreSQL and Adminer off public interfaces.
- Persist and back up both PostgreSQL and the uploads volume together.
- Apply migrations before accepting traffic; retain a tested restore plan.
- Tune `ORDER_HISTORY_RATE_*` for expected traffic; add proxy/application rate limits for login, refresh, and checkout.
- Add monitoring, structured logs, database-aware readiness, and alerting.
- Run multiple Uvicorn workers/processes as appropriate for expected load.

## Troubleshooting

- **Settings validation on import:** a required environment variable is absent or malformed.
- **Database connection refused:** confirm host/port and PostgreSQL health; inside Compose use `postgres`, not `localhost`.
- **CORS/browser cookie failure:** verify the exact origin, browser `credentials: "include"`, HTTPS, Secure, and SameSite settings.
- **401 after login:** send the JSON access token in the Bearer header; the refresh cookie is not an access credential.
- **Upload write failure:** make `UPLOAD_ROOT` writable and persistent.
- **Invoice font error:** install/retain DejaVu or another Unicode font covering Latin and Arabic.
- **409 on delete:** the record is protected by related data or an administrator-deletion rule.
- **422 response:** inspect FastAPI's `detail` array and bind messages to the reported body/query/path field.

## Development notes

Prices and fees are decimal strings in JSON; never calculate money with JavaScript floating point. Public catalog routes hide inactive records. Checkout trusts database prices, not client totals. Guest order history requires the phone and public order number, exchanges them for a short-lived `order-history` token, and returns only that verified order with `Cache-Control: no-store`. Verification is rate limited per IP, per phone, and globally; this is a knowledge-based mitigation, not proof of phone ownership.

## Tests

Install the development dependencies and run pytest against a reachable PostgreSQL instance:

```bash
pip install -r requirements-dev.txt
DATABASE_HOST=localhost python -m pytest tests -q
```

Each test runs inside a transaction that is rolled back, including rate-limit counters, so no rows are persisted. When PostgreSQL is reachable only from Compose, copy `tests/` into the `api` container and run `python -m pytest tests -q` there.
