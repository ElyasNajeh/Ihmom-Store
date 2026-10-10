# API Reference

This reference describes the implemented Ihmom Store API. Examples assume `http://localhost:8000`; IDs are positive integers, timestamps are ISO 8601, and PostgreSQL decimal values are serialized as JSON strings such as `"19.90"`.

Interactive, generated documentation is available at `/docs`, `/redoc`, and `/openapi.json`.

## Conventions

**Authentication.** Endpoints marked **Admin** require `Authorization: Bearer <access_token>`. Login and refresh return the access token in JSON. The refresh JWT is never returned in JSON; it is an `HttpOnly` `refresh_token` cookie scoped to `/auth`. Browser calls to login, refresh, and logout should use credentials.

**Pagination.** Unless stated otherwise, list endpoints accept integer `page` (default 1, minimum 1) and `page_size` (default 12, range 1–100) and return:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 12,
  "total_pages": 0
}
```

Search is case-insensitive across the documented fields. Filtering, ordering, counting, and pagination run in PostgreSQL with deterministic ID tie-breaking. An out-of-range page is a successful empty page.

**Errors.** Application failures are `{"detail":"Readable message"}`. Validation is FastAPI's field-oriented structure:

```json
{
  "detail": [
    {"type": "greater_than_equal", "loc": ["query", "page"], "msg": "Input should be greater than or equal to 1", "input": 0, "ctx": {"ge": 1}}
  ]
}
```

Common statuses are `400` invalid workflow/file, `401` invalid or missing authentication, `403` disallowed refresh/logout Origin, `404` missing/hidden resource, `409` uniqueness/reference/state conflict, `422` contract validation, and sanitized `500` unexpected processing failure. `429` is not emitted by this application because rate limiting belongs to the deployment layer.

## Health

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /` | Public | None | `200 {"message":"Ihmom Store API is running"}` | Process response only. |
| `GET /health` | Public | None | `200 {"status":"healthy"}` | Liveness only; it does not query PostgreSQL. |

## Authentication

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | Public | JSON `email` (valid, ≤255, trimmed/lowercased), `password` (non-empty) | `200 LoginResponse`; sets refresh cookie | `401` uses one generic invalid-credential message; `422` malformed body. |
| `POST /auth/refresh` | Refresh cookie | No body; cookie and, for browsers, allowed `Origin` | `200 RefreshResponse`; replaces refresh cookie | `401` missing/invalid/expired token or removed admin; `403` Origin mismatch. Refresh tokens cannot be Bearer access tokens. |
| `POST /auth/logout` | Public/cookie | No body; allowed `Origin` | `200 {"message":"Logged out successfully"}`; expires cookie | Idempotent; `403` Origin mismatch. Clearing a cookie cannot revoke an already copied stateless JWT. |
| `GET /auth/me` | Admin | Bearer access token | `200 {id,username,email}` | `401` missing/invalid/expired/wrong-type token or removed admin. |

Login:

```http
POST /auth/login
Content-Type: application/json

{"email":"admin@example.com","password":"correct horse battery staple"}
```

```json
{
  "message": "Login successful",
  "username": "store_admin",
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

Refresh has the same token fields except `username`: `message`, `access_token`, `token_type`, and `expires_in`. Neither response exposes the refresh token.

## Administrators

`AdminResponse` is `{id, username, email, created_at}`; password hashes are never serialized. Username is trimmed, 3–100 characters. Email is trimmed/lowercased and ≤255. Password is at least 8 characters, not whitespace-only, and no more than 72 UTF-8 bytes.

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `POST /admins/` | Admin | JSON `{username,email,password}` | `201 AdminResponse` | `409` duplicate username/email, including races; `422` invalid fields. |
| `GET /admins/` | Admin | `page`, `page_size` | `200 PageResponse<AdminResponse>` | Ordered newest first; `422` invalid pagination. |
| `GET /admins/{admin_id}` | Admin | Positive path ID | `200 AdminResponse` | `404` missing; `422` invalid ID. |
| `DELETE /admins/{admin_id}` | Admin | Positive path ID | `204`, empty body | `404` missing; `409` self-delete or final-admin deletion. The final-admin check is concurrency-safe. |

Create example: `{"username":"ops_admin","email":"ops@example.com","password":"StrongPass123"}`.

## Categories and brands

Both resources use `{id,name_ar,name_en,is_active,created_at}`. Names are independently unique, trimmed, required, non-null, and 1–100 characters. Create accepts `is_active` (default `true`); PATCH accepts any subset but rejects explicit null. Public reads contain active records only.

### Categories

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /categories/` | Public | Page; `search` ≤100; `sort_by=id\|created_at\|name_ar\|name_en` (default `name_en`); `sort_order=asc\|desc` | `200 PageResponse<CategoryResponse>` | Active only; search both names. |
| `GET /categories/admin/all` | Admin | Public queries plus optional `is_active`; default sort `created_at desc` | `200` page including inactive | `422` invalid query. |
| `GET /categories/admin/{category_id}` | Admin | Positive ID | `200 CategoryResponse` | `404` missing. |
| `POST /categories/` | Admin | JSON `{name_ar,name_en,is_active?}` | `201 CategoryResponse` | `409` either duplicate name. |
| `GET /categories/{category_id}` | Public | Positive ID | `200 CategoryResponse` | `404` missing or inactive. |
| `PATCH /categories/{category_id}` | Admin | Partial category JSON | `200 CategoryResponse` | `404`; `409` duplicate; `422` empty/null/long name. |
| `DELETE /categories/{category_id}` | Admin | Positive ID | `204` | `404`; `409` if any product, active or inactive, references it. |

### Brands

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /brands/` | Public | Page; `search` ≤100; `sort_by=id\|created_at\|name_ar\|name_en` (default `name_en`); `sort_order` | `200 PageResponse<BrandResponse>` | Active only; search both names. |
| `GET /brands/admin/all` | Admin | Public queries plus optional `is_active`; default `created_at desc` | `200` page including inactive | `422` invalid query. |
| `GET /brands/admin/{brand_id}` | Admin | Positive ID | `200 BrandResponse` | `404` missing. |
| `POST /brands/` | Admin | JSON `{name_ar,name_en,is_active?}` | `201 BrandResponse` | `409` either duplicate name. |
| `GET /brands/{brand_id}` | Public | Positive ID | `200 BrandResponse` | `404` missing or inactive. |
| `PATCH /brands/{brand_id}` | Admin | Partial brand JSON | `200 BrandResponse` | `404`; `409` duplicate; `422` invalid/null field. |
| `DELETE /brands/{brand_id}` | Admin | Positive ID | `204` | `404`; `409` if any product references it. |

Create example and paginated response:

```json
{"name_ar":"العناية بالبشرة","name_en":"Skin Care","is_active":true}
```

```json
{
  "items": [{"id":1,"name_ar":"العناية بالبشرة","name_en":"Skin Care","is_active":true,"created_at":"2026-10-10T09:00:00Z"}],
  "total": 1,
  "page": 1,
  "page_size": 12,
  "total_pages": 1
}
```

## Sliders

`SliderResponse` is `{id,title_ar,title_en,display_order,is_active,image,created_at}`. Titles are trimmed, required, 1–200 characters. `display_order` is an integer (boolean is rejected). `image` is a server-generated `/uploads/sliders/<uuid>.webp` URL.

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /sliders/` | Public | Page; `search` ≤200; `sort_by=id\|created_at\|display_order\|title_ar\|title_en` (default `display_order asc`); `sort_order` | `200 PageResponse<SliderResponse>` | Active only; searches both titles. |
| `GET /sliders/admin/all` | Admin | Same plus optional `is_active`; default `created_at desc` | `200` page including inactive | `422` invalid query. |
| `GET /sliders/admin/{slider_id}` | Admin | Positive ID | `200 SliderResponse` | `404` missing. |
| `POST /sliders/` | Admin | `multipart/form-data`: required `title_ar`, `title_en`, `image`; optional `display_order=0`, `is_active=true` | `201 SliderResponse` | `400` empty/corrupt/unsafe image; `422` form validation. |
| `GET /sliders/{slider_id}` | Public | Positive ID | `200 SliderResponse` | `404` missing/inactive. |
| `PATCH /sliders/{slider_id}` | Admin | JSON subset of title fields, `display_order`, `is_active` | `200 SliderResponse` | Does not replace image; `404`/`422`. |
| `PATCH /sliders/{slider_id}/image` | Admin | multipart required `image` | `200 SliderResponse` | Converts to WebP, removes old file; `400` invalid image, `404` slider. |
| `DELETE /sliders/{slider_id}` | Admin | Positive ID | `204` | Removes row and stored image; `404` missing. |

Example upload: `curl -X POST -H "Authorization: Bearer $TOKEN" -F title_ar=عرض -F title_en=Sale -F display_order=1 -F is_active=true -F image=@banner.jpg http://localhost:8000/sliders/`.

## Customers

All customer endpoints are admin-only. `CustomerResponse` is `{id,name,phone,created_at}`. Name is trimmed and 1–150 characters. Phone accepts `05xxxxxxxx`, `9705xxxxxxxx`, `9725xxxxxxxx`, `+9705xxxxxxxx`, or `+9725xxxxxxxx` in the supported 9-digit-mobile format and stores the canonical international value. Unknown fields are rejected.

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /customers/` | Admin | Page; `search` ≤150 (name/phone); `sort_by=id\|created_at\|name` (default `created_at desc`); `sort_order` | `200 PageResponse<CustomerResponse>` | `422` invalid query. |
| `GET /customers/{customer_id}` | Admin | Positive ID | `200 CustomerResponse` | `404` missing. |
| `POST /customers/` | Admin | JSON `{name,phone}` | `201 CustomerResponse` | `409` duplicate normalized phone; `422` invalid input. |
| `PATCH /customers/{customer_id}` | Admin | Partial `{name?,phone?}`; explicit null rejected | `200 CustomerResponse` | `404`; `409` duplicate phone; `422`. |
| `DELETE /customers/{customer_id}` | Admin | Positive ID | `204` | `404`; `409` when referenced by an order. |

## Delivery areas

Admin `DeliveryAreaResponse` is `{id,name_ar,name_en,delivery_fee,is_active,created_at}`. Public responses omit `is_active` and `created_at`. Names are trimmed, independently unique, and 1–150 characters. Fee is decimal `NUMERIC(10,2)`, from zero through 8 integer digits plus 2 decimals.

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /delivery-areas/` | Public | Page; `search` ≤150; `sort_by=id\|created_at\|name_ar\|name_en\|delivery_fee` (default `name_en asc`); `sort_order` | `200 PageResponse<PublicDeliveryAreaResponse>` | Active only. |
| `GET /delivery-areas/admin/all` | Admin | Same plus `is_active`; default `created_at desc` | `200 PageResponse<DeliveryAreaResponse>` | Includes inactive. |
| `GET /delivery-areas/admin/{area_id}` | Admin | Positive ID | `200 DeliveryAreaResponse` | `404`. |
| `POST /delivery-areas/` | Admin | JSON `{name_ar,name_en,delivery_fee,is_active?}` | `201 DeliveryAreaResponse` | `409` duplicate name; `422` negative/excess precision/null. |
| `GET /delivery-areas/{area_id}` | Public | Positive ID | `200 PublicDeliveryAreaResponse` | `404` missing/inactive. |
| `PATCH /delivery-areas/{area_id}` | Admin | Partial admin fields; explicit null rejected | `200 DeliveryAreaResponse` | `404`, `409`, `422`. |
| `DELETE /delivery-areas/{area_id}` | Admin | Positive ID | `204` | `404`; `409` if referenced by any order. |

Example: `{"name_ar":"رام الله","name_en":"Ramallah","delivery_fee":"10.00","is_active":true}`.

## Products, variants, and images

### Product contracts

Required create fields are `category_id`, `brand_id`, `name_ar`, and `name_en`. Names are trimmed and 1–200 characters. Descriptions are optional; blank values normalize to null. All IDs are positive and unknown fields are rejected.

A simple product supplies `price` and optional `sku`, leaving `variants` absent/null:

```json
{
  "category_id": 1,
  "brand_id": 1,
  "name_ar": "غسول لطيف",
  "name_en": "Gentle Cleanser",
  "description_ar": null,
  "description_en": "Daily cleanser",
  "is_active": true,
  "price": "29.90",
  "sku": "CLEAN-001"
}
```

A selectable product omits top-level `price`/`sku` and supplies a non-empty `variants` array:

```json
{
  "category_id": 1,
  "brand_id": 1,
  "name_ar": "مرطب",
  "name_en": "Moisturizer",
  "variants": [
    {"name_ar":"50 مل","name_en":"50 ml","sku":"MOIST-50","price":"35.00","is_active":true},
    {"name_ar":"100 مل","name_en":"100 ml","sku":"MOIST-100","price":"55.00","is_active":true}
  ]
}
```

Price is 0 or greater with at most 8 integer and 2 fractional digits. SKU is optional, trimmed, ≤100, blank→null, and unique when non-null. Variant names are 1–100; `__default__`/`__default__` is reserved. An active multi-variant product needs an active variant.

Admin `ProductResponse` includes IDs, names/descriptions, `is_active`, `created_at`, category/brand summaries, full variants `{id,product_id,name_ar,name_en,sku,price,is_active,created_at}`, and full images `{id,product_id,image,is_primary,created_at}`. Public `PublicProductResponse` replaces those internals with `starting_price`, `has_selectable_variants`, active public variants `{id,name_ar?,name_en?,price}`, and images `{id,image,is_primary}`. Reserved simple-variant names are omitted.

### Product endpoints

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /products/` | Public | Page; optional positive `category_id`, `brand_id`; `search` ≤200; decimal `min_price`, `max_price`; `sort=newest\|oldest\|name_ar\|name_en\|price_asc\|price_desc`; repeatable `ids` | `200 PageResponse<PublicProductResponse>` | Active product/category/brand/variant visibility; min ≤ max; searches both names. |
| `GET /products/admin/all` | Admin | Page; category/brand/search; optional `is_active`; `sort_by=id\|created_at\|name_ar\|name_en\|price`, `sort_order` | `200 PageResponse<ProductResponse>` | Includes inactive. |
| `GET /products/admin/{product_id}` | Admin | Positive ID | `200 ProductResponse` | `404`. |
| `GET /products/by-ids` | Public | Repeat `ids=1&ids=2`; 1–100 positive IDs | `200 PublicProductResponse[]` | Preserves requested-ID selection semantics but returns only public-visible products; `422` invalid/empty. |
| `GET /products/{product_id}/recommendations` | Public | Positive ID; `limit` default 4, range 1–20 | `200 PublicProductResponse[]` | Source must be public-visible; recommendations obey public visibility; `404` source. |
| `GET /products/{product_id}` | Public | Positive ID | `200 PublicProductResponse` | `404` missing or not publicly visible. |
| `POST /products/` | Admin | `ProductCreate` JSON shown above | `201 ProductResponse` | `404` category/brand; `409` SKU conflict; `422` model/price/variant rule. |
| `PATCH /products/{product_id}` | Admin | Any subset of category/brand/names/descriptions/is_active | `200 ProductResponse` | Price/SKU/variants are managed through variant endpoints; `404`, `409`, `422`. Explicit null allowed only for descriptions. |
| `DELETE /products/{product_id}` | Admin | Positive ID | `204` | `404`; `409` if any variant is referenced by an order. Otherwise variants/images and stored files are removed. |

### Variant endpoints

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /products/{product_id}/variants` | Admin | Positive product ID | `200 ProductVariantResponse[]` | `404` product. |
| `POST /products/{product_id}/variants` | Admin | JSON `{name_ar,name_en,price,sku?,is_active?}` | `201 ProductVariantResponse` | Converts a simple product to selectable behavior as defined by service rules; `404`; `409` SKU; `422`. |
| `PATCH /products/{product_id}/variants/{variant_id}` | Admin | Partial variant JSON | `200 ProductVariantResponse` | IDs must match relation; explicit null rejected except SKU (null clears it); `404`, `409`, `422`. |
| `DELETE /products/{product_id}/variants/{variant_id}` | Admin | Positive IDs | `204` | `404`; `409` referenced variant or deletion that would violate product availability. |

### Image endpoints

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /products/{product_id}/images` | Admin | Positive product ID | `200 ProductImageResponse[]` | `404` product. |
| `POST /products/{product_id}/images` | Admin | multipart repeated field `files` containing one or more images | `201 ProductImageResponse[]` | Converts to WebP; first image becomes primary if none exists; `400` empty/corrupt/unsafe; `404`; transaction/file compensation on failure. |
| `PATCH /products/{product_id}/images/{image_id}/set-primary` | Admin | Positive IDs, no body | `200 ProductImageResponse` | Atomically clears prior primary; `404` product/image. |
| `DELETE /products/{product_id}/images/{image_id}` | Admin | Positive IDs | `204` | Removes file; promotes another image when required; `404`. |

Use each returned relative image path with the API origin, for example `http://localhost:8000/uploads/products/<uuid>.webp`. Upload example:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "files=@front.jpg" -F "files=@back.heic" \
  http://localhost:8000/products/1/images
```

## Orders

Order statuses are `pending`, `confirmed`, `out_for_delivery`, `delivered`, and `cancelled`.

### Guest checkout

`POST /orders/checkout` is public. Body fields:

- `customer_name`: required trimmed string, 1–150.
- `customer_phone`: required supported mobile number, normalized.
- `delivery_area_id`: required positive strict integer.
- `address`: required nonblank trimmed string.
- `notes`: optional string; blank→null.
- `items`: required non-empty array of `{product_variant_id, quantity}`. Both are strict positive integers; quantity maximum is 2,147,483,647. Variant IDs cannot repeat.

```json
{
  "customer_name": "Lina Ahmad",
  "customer_phone": "0591234567",
  "delivery_area_id": 1,
  "address": "Ramallah, Main Street",
  "notes": "Call on arrival",
  "items": [
    {"product_variant_id": 4, "quantity": 2},
    {"product_variant_id": 8, "quantity": 1}
  ]
}
```

Success is `201 CheckoutOrderResponse`:

```json
{
  "order_number": "IHM-AbCdEfGhIjKlMnOpQr",
  "status": "pending",
  "created_at": "2026-10-10T09:30:00Z",
  "customer_name": "Lina Ahmad",
  "delivery_area_name_ar": "رام الله",
  "delivery_area_name_en": "Ramallah",
  "address": "Ramallah, Main Street",
  "items": [{"product_name_ar":"غسول لطيف","product_name_en":"Gentle Cleanser","variant_name_ar":null,"variant_name_en":null,"quantity":2,"unit_price":"29.90","total":"59.80"}],
  "subtotal": "59.80",
  "delivery_fee": "10.00",
  "total": "69.80"
}
```

The server loads active products/variants/category/brand/delivery area and computes prices/totals; it accepts no client price. Unavailable catalog/area data and invalid/overflowing values return `422`; transaction race/conflict conditions return `409`. The entire checkout is atomic.

### Public order history

`POST /orders/history?page=1&page_size=12` is public with JSON `{"phone":"0591234567"}`. It returns `200 PageResponse<OrderHistoryItemResponse>` and `Cache-Control: no-store`. Each item is `{order_number,status,created_at,total_quantity,subtotal,delivery_fee,total}`; it intentionally excludes address, customer name, notes, line items, and database IDs. Equivalent phone formats normalize to the same customer identity. No results produce an empty page. Invalid phones/pagination return `422`.

This phone-only flow is privacy-sensitive and should be deployment-rate-limited. There is no `/orders/track` endpoint.

### Admin order endpoints

`OrderResponse` includes `{id,order_number,customer_id,customer_name,customer_phone,delivery_area_id,delivery_area:{id,name_ar,name_en},address,notes,subtotal,delivery_fee,total,status,created_at,items}`. Each item contains `{id,product_variant_id,product_name_ar,product_name_en,variant_name_ar?,variant_name_en?,quantity,unit_price,total,created_at}`.

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /orders/admin/all` | Admin | Page; `search` ≤150; `sort_by=id\|created_at\|total\|customer_name\|status` (default `created_at desc`); `sort_order`; optional `status`, positive `delivery_area_id`, ISO dates `date_from`/`date_to`, decimal `min_total`/`max_total` | `200 PageResponse<OrderResponse>` | Search number/name/phone; from ≤ to and min ≤ max; `422` invalid query. |
| `GET /orders/admin/{order_id}` | Admin | Positive ID | `200 OrderResponse` | `404`. |
| `GET /orders/admin/{order_id}/items` | Admin | Positive ID | `200 OrderItemResponse[]` | `404` order. |
| `PATCH /orders/admin/{order_id}/status` | Admin | JSON `{status}` using allowed enum | `200 OrderResponse` | `404` missing; `409` invalid lifecycle transition/concurrent conflict; `422` invalid enum/extra field. |
| `GET /orders/admin/{order_id}/invoice` | Admin | Positive ID | `200 application/pdf` download; private/no-store | Filename `ihmom-store-invoice-<order_number>.pdf`; `404`; sanitized `500` when Arabic font unavailable. |

Status example: `{"status":"confirmed"}`. Invoice clients must request a blob, not JSON.

## Dashboard

| Method/path | Access | Input | Success | Errors/rules |
| --- | --- | --- | --- | --- |
| `GET /dashboard/stats` | Admin | `period=day\|week\|month\|year\|all`, default `day` | `200 DashboardStatsResponse` | `401` auth; `422` invalid period. Period applies to order metrics/recent orders. |

Response fields:

```json
{
  "admins": 2,
  "brands": 8,
  "categories": 6,
  "active_categories": 5,
  "customers": 45,
  "sliders": 3,
  "active_sliders": 2,
  "products": 120,
  "variants": 178,
  "total_orders": 12,
  "pending_orders": 3,
  "confirmed_orders": 2,
  "out_for_delivery_orders": 1,
  "delivered_orders": 5,
  "cancelled_orders": 1,
  "pending_subtotal": "120.00",
  "confirmed_subtotal": "80.00",
  "out_for_delivery_subtotal": "40.00",
  "delivered_subtotal": "500.00",
  "cancelled_subtotal": "30.00",
  "total_order_value": "770.00",
  "delivered_revenue": "500.00",
  "cancelled_order_value": "30.00",
  "recent_orders": [{"order_number":"IHM-20261010-ABC123","customer_name":"Lina Ahmad","total":"69.80","status":"pending","created_at":"2026-10-10T09:30:00Z"}]
}
```

Delivered revenue includes delivered orders only. Empty periods return zero counts/decimal values and an empty `recent_orders` array.
