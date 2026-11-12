# Ihmom Store API

Optional owner-only WhatsApp order notifications use a PostgreSQL transactional
outbox and the `notifications` Compose worker. They are disabled by default.
See [Bird setup, retry/delivery semantics and deployment](docs/BIRD_NOTIFICATIONS.md)
for private environment configuration and safe operator commands. Checkout never
calls Bird; Redis authentication/checkout limits remain unchanged.

FastAPI backend for the bilingual catalog, guest cash-on-delivery checkout,
admin dashboard, order history and invoices. Runtime dependencies are declared
in `requirements.txt`; testing dependencies are in `requirements-dev.txt`.

## Architecture

- `app/core/`: settings, JWT/session authentication and Redis rate limiting.
- `app/db/`: SQLAlchemy base, sessions and the
  interactive initial-admin command.
- `app/features/`: feature-local models, Pydantic schemas, services and routers.
- `app/shared/`: query parsing, CRUD, images, phone and uniqueness helpers.
- `alembic/`: the production migration history.
- `tests/`: permanent isolated unit, integration, migration and API-flow tests.

Seed/sample-data loaders and the unused database-creation utility have been
removed. PostgreSQL initialization belongs to infrastructure and schema
initialization belongs to Alembic. Existing application records are unaffected.

## Local setup

Use the root `.env.example` as a template and preserve any existing real
`.env`. Settings read environment variables and root/backend-parent
configuration. Required settings include the application name, database
connection values and JWT secret. Redis is required for startup and security
rate limiting.

From the repository root, the development Compose configuration installs
dependencies, waits for PostgreSQL/Redis, applies migrations and starts the API
with reload. See the [root README](../README.md) for commands and service ports.

For native development, install dependencies and configure a reachable database,
Redis, a writable `UPLOAD_ROOT`, and the required environment variables. From
`Ihmom-StoreAPI/`:

```powershell
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

For an initial administrator on a new database:

```powershell
python -m app.db.create_admin
```

It prompts for a username, email and hidden password. No default/shared
administrator credentials or catalog sample records are provided.

## Contracts and security

The running application serves Swagger at `/docs`, ReDoc at `/redoc`, and
the authoritative OpenAPI schema at `/openapi.json`.

Login returns a short-lived bearer access token and an HttpOnly refresh cookie.
Tokens reference a database-backed admin session. Refresh rotates atomically;
replay revokes the session family. Logout revokes the current session so its
access tokens stop working immediately. Devices have independent sessions.
Browser refresh/logout requests must include credentials and an allowed origin.

Redis enforces failed-login limits per account/IP and checkout limits per IP.
The API requires Redis at startup and fails closed if enforcement is unavailable.
Guest order-verification limits also use Redis (IP, normalized phone and global
sliding windows). No rate-limit counters are stored in PostgreSQL.

Public products always use the public response schema and hide inactive catalog
records. Dedicated authenticated product reads are under `/products/admin/`.
Checkout requires a UUID `Idempotency-Key` header and calculates all prices and
delivery fees from database values. Historical order items retain purchased
names and prices. Paginated endpoints accept page sizes 1 through 100, default 20.

Uploads are decoded, optimized and encoded as WebP under `/uploads`. Keep
`UPLOAD_ROOT` persistent. English/Arabic PDF generation requires a compatible
Unicode font; the Docker images install DejaVu fonts.

Categories have one optional `image` URL stored directly on `categories`.
Authenticated `PUT /categories/{id}/image` accepts one multipart `image`
file and returns the updated category. `DELETE /categories/{id}/image` clears
it and also returns the category. Replacing/removing an image cleans up unused
files only after a successful database commit. Product galleries are unchanged.

Revision `d8b4f1a2c3e5` archives all legacy image associations in the
migration-owned `category_image_migration_archive` table, copies the primary
image (or oldest image, breaking ties by ID) into `categories.image`, then
drops `category_images`. The archive has no application model, relationship
or gallery API; Alembic excludes it from application-model autogeneration.
The migration does not delete media files. Its downgrade restores archived
associations for surviving categories and includes current replacement images.
Categories without images remain valid with a null image.

Revision `e9c5a2b3d4f6` drops the obsolete, transient
`rate_limit_counters` table. It does not remove orders, customers, sessions,
or catalog records. Redis remains required and fails closed when unavailable.
Existing Redis configuration and rate-limit environment variables are unchanged.

## Migrations and production

Production uses the root `docker-compose.prod.yml` and applies Alembic upgrades
before serving requests. The committed revisions remain unchanged by cleanup.
Never run downgrade experiments against shared databases. Keep PostgreSQL and
uploads volumes and protect the real `.env`.

## Tests

Follow [tests/README.md](tests/README.md). The suite refuses database names that
do not end in `_test` and uses disposable PostgreSQL/Redis services, temporary
uploads and isolated transactions. Migration and concurrency tests also create
their own test resources. Do not run the suite inside the production API
container or against the production database.

Tests without a running database:

```powershell
python -m pytest tests/unit -q
python -m pytest --collect-only -q
```

Current cleanup verification is recorded in [CLEANUP_REPORT.md](../CLEANUP_REPORT.md).
