# Backend Architecture

## Overview

Ihmom Store is a single FastAPI application organized by feature. It deliberately uses a direct router → service → SQLAlchemy model flow rather than repositories or generic service layers. PostgreSQL is the source of truth; the local/persistent upload directory stores image bytes, while database rows store public `/uploads/...` paths.

`app/main.py` creates the application, enables credentialed CORS for configured origins, registers every feature router, mounts static uploads, and exposes root/health endpoints.

## Request flow

1. Uvicorn passes a request to FastAPI.
2. FastAPI validates path/query/body/form values with Pydantic schemas.
3. Protected routes resolve the Bearer token and current administrator.
4. `get_db` supplies one SQLAlchemy session for the request and closes it afterward.
5. The feature service runs SQL-level filters, relationship loading, and transaction work.
6. FastAPI serializes the declared response model or returns a deliberate `HTTPException`.

Unexpected database details are not returned intentionally. Services roll back transactions they own before converting expected integrity failures to stable `409`, `404`, or other application errors.

## Modules

| Area | Responsibility |
| --- | --- |
| `app/core/config.py` | Required environment settings, PostgreSQL URL, CORS origin parsing |
| `app/core/security.py` | bcrypt, JWT creation/validation, Bearer dependency |
| `app/db/` | declarative base, engine/session dependency, secure admin bootstrap |
| `app/features/admins` | admin model, create/list/get/delete rules |
| `app/features/auth` | login, refresh cookie, logout, current admin |
| `app/features/categories` | bilingual catalog categories and product delete protection |
| `app/features/brands` | bilingual brands and product delete protection |
| `app/features/sliders` | bilingual promotional sliders and image lifecycle |
| `app/features/products` | products, internal/simple variants, selectable variants, images |
| `app/features/customers` | normalized guest customer identities and admin management |
| `app/features/delivery_areas` | bilingual areas, fees, active checkout availability |
| `app/features/orders` | checkout, history, admin workflow, item views, invoice PDF |
| `app/features/dashboard` | aggregate counts, values, revenue, and recent orders |
| `app/shared` | page response, common CRUD helpers, phone normalization, image processing/cleanup |

Each feature normally contains `model.py`, `schema.py`, `service.py`, and `router.py`. Dashboard and auth omit database models because they operate on existing entities.

## Data model

The application has 11 tables:

- `admins`: unique username/email and bcrypt password hash.
- `categories` and `brands`: unique Arabic and English names; each has many products.
- `products`: belongs to one category and brand; has variants and images.
- `product_variants`: belongs to one product; nullable globally unique SKU; price and active state.
- `product_images`: belongs to one product; a PostgreSQL partial unique index permits at most one primary image per product.
- `customers`: unique normalized phone; has many orders.
- `delivery_areas`: unique bilingual names and non-negative decimal fee; has many orders.
- `orders`: customer and delivery-area references plus customer/address/price snapshots and status.
- `order_items`: belongs to an order and references the purchased variant; stores quantity and price totals.
- `sliders`: bilingual titles, ordering, active flag, and upload path.

Product deletion cascades to its variants and images, but is blocked when a variant is referenced by an order item. Order deletion is not exposed; order items cascade only with their parent order. Category, brand, customer, and delivery-area deletion is blocked while referenced. Admin deletion prevents self-deletion and removal of the final administrator.

The product and variant names shown on historical orders are resolved through the retained product/variant relation. Consequently, referenced products/variants cannot be deleted, and later name changes will be reflected in responses/invoices even though money, customer name/phone, address, and delivery-area fee are snapshotted. This is an existing data-model decision, not a separate item-name snapshot column.

## Product rules

A simple product is represented internally by one reserved `__default__` variant containing its SKU and price. Public responses omit the reserved names and report `has_selectable_variants=false`. A multi-variant product has one or more named variants and cannot also accept top-level `price`/`sku` during creation. Active products require an active category, brand, and at least one active variant to be publicly visible.

SKU is optional; non-null values are unique. Names and optional text are trimmed, blank optional descriptions/SKUs normalize to `null`, prices use `NUMERIC(10,2)`, and arbitrary request fields are rejected by the product schemas.

## Checkout and transactions

Checkout normalizes the phone, validates the active delivery area, locks/loads the requested variants and their products, rejects inactive catalog dependencies, and derives every unit price from PostgreSQL. Duplicate variant IDs and non-positive/boolean quantities are rejected. Subtotal, fee, and total are calculated with `Decimal`; client totals are not accepted.

Customer reuse/creation, order insertion, and item insertion are committed as one transaction. Expected uniqueness races are retried or converted safely. Any failure rolls back the session, so no partial order or orphan customer remains. Order numbers are unique and collision handling is tested.

The order status set is `pending`, `confirmed`, `out_for_delivery`, `delivered`, and `cancelled`. Service rules enforce allowed transitions and use row locking so concurrent transitions cannot silently overwrite each other.

## Authentication and authorization

Passwords are bcrypt hashes. Login looks up a lowercased email and returns a JWT access token (default 30 minutes) while setting a JWT refresh token (default seven days) in an `HttpOnly` cookie:

- cookie name: `refresh_token`
- path: `/auth`
- `Secure`: configured; must be `true` in production HTTPS
- `SameSite`: configured (`strict` by default)
- lifetime: same as refresh JWT

JWTs include `sub`, `exp`, `iat`, unique `jti`, and `token_type`. Protected routes accept only `token_type=access` via `Authorization: Bearer`. Refresh accepts only `token_type=refresh`, rotates both tokens, and confirms the admin still exists. Refresh/logout requests carrying an `Origin` header must match configured CORS origins, providing a minimal CSRF boundary in addition to SameSite.

Refresh rotation is stateless. There is no approved token/revocation table or external store, so the previous refresh JWT and a copied token remain cryptographically valid until expiry. Logout clears the browser cookie only. For immediate revocation, reuse detection, or session management, approve and add server-side state in a future design change. Protect `SECRET_KEY`, keep refresh life conservative, and use HTTPS.

## Phone history privacy

`POST /orders/history` intentionally authenticates the lookup only by normalized phone number. It returns order summaries—not customer address, notes, item names, or internal IDs—and sends `Cache-Control: no-store`. This still permits enumeration/abuse by anyone who knows a phone number. The current architecture has no rate-limit store, OTP, or customer accounts. Production must add reverse-proxy/WAF rate limits, monitoring, and suitable privacy disclosure; stronger proof of possession requires an approved product/API change.

## Upload flow

Product/slider files are streamed into a spooled temporary file, decoded by Pillow/pillow-heif, EXIF-orientation corrected, resized within feature limits, converted to WebP, and atomically moved to a UUID filename. Original names never become paths. Empty, corrupted, unidentified, or decompression-bomb images produce sanitized `400` errors. Path resolution verifies files stay within their upload subdirectory.

Services compensate across the database/filesystem boundary: failed record creation removes the newly written file; replacement/deletion removes old files after database success. The filesystem and PostgreSQL are not a distributed transaction, so operational backup/restore must treat both as one dataset.

## Querying and pagination

List endpoints apply search, filters, count, allowlisted sorting, deterministic ID tie-breaking, offset, and limit in SQL. Page numbers start at 1, defaults are generally 12 items, and `page_size` is capped at 100. Responses use:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 12,
  "total_pages": 0
}
```

Search uses bound SQLAlchemy expressions and escaped wildcard handling, not interpolated raw SQL. Relevant product/order relationships are eager-loaded to avoid per-item N+1 queries.

## Error handling

- `400`: invalid image/file, invalid status transition, or request that is structurally valid but violates a workflow rule.
- `401`: missing/invalid/expired authentication or credentials.
- `403`: refresh/logout Origin is not allowed.
- `404`: missing resource; public inactive resources are also intentionally hidden as missing.
- `409`: unique conflict, referenced-record deletion, admin deletion restriction, or concurrency conflict.
- `422`: FastAPI/Pydantic path, query, or body validation.
- `500`: sanitized unexpected operation failure such as unavailable invoice font.

Application errors normally use `{"detail":"message"}`. Validation errors use FastAPI's `{"detail":[...]}` structure. Empty lists are successful paginated results, including pages beyond the last page.

## Alembic and startup

`alembic/env.py` imports every model so `Base.metadata` is complete and builds its URL from application settings. Type comparison is enabled. The committed initial revision builds all 11 application tables, constraints, indexes, and relationships.

Both Compose variants wait for the PostgreSQL health check and run `python -m alembic upgrade head && ...uvicorn`. A migration error therefore prevents API startup. Development bind-mounts code/migrations and uses `--reload`; production copies them into the image and does not reload. PostgreSQL and uploads use named volumes.

## Operational boundaries

The current `/health` endpoint is liveness only. The application does not include distributed rate limiting, token revocation, background queues, stock reservation, customer accounts, payment processing, or observability infrastructure. Those must be deliberate deployment/product decisions, not silently added to this compact backend.
