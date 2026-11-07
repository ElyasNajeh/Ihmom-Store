# Frontend Integration Guide

This guide targets the Ihmom Store React/TypeScript client. The exact endpoint catalogue and field constraints are in [API_REFERENCE.md](API_REFERENCE.md).

## Base URL

Expose the API origin through Vite:

```env
VITE_API_URL=http://localhost:8000
```

```ts
export const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
```

Returned image paths are relative to the API, not the UI:

```ts
export function imageUrl(path: string): string {
  return new URL(path, `${API_URL}/`).toString();
}
```

In production use HTTPS for both origins. The UI origin must exactly match one of `CORS_ORIGINS`.

## Core types

Money arrives as a string. Keep it as a string/decimal-library value for calculations; only convert for display with deliberate rounding.

```ts
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string | Array<{
    type: string;
    loc: Array<string | number>;
    msg: string;
    input?: unknown;
    ctx?: Record<string, unknown>;
  }>;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface PublicVariant {
  id: number;
  name_ar?: string;
  name_en?: string;
  price: string;
}

export interface PublicProduct {
  id: number;
  category_id: number;
  brand_id: number;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  starting_price: string;
  has_selectable_variants: boolean;
  category: { id: number; name_ar: string; name_en: string };
  brand: { id: number; name_ar: string; name_en: string };
  variants: PublicVariant[];
  images: Array<{ id: number; image: string; is_primary: boolean }>;
}
```

## Authentication flow

The access JWT belongs in memory only. Do not write it to cookies, `localStorage`, or `sessionStorage`. The backend owns the refresh token in an `HttpOnly` cookie; JavaScript cannot and should not read it.

1. Login with `credentials: "include"`.
2. Store `access_token` in application memory (context/state/module variable).
3. Add `Authorization: Bearer <access_token>` to admin requests.
4. On the first `401`, call `/auth/refresh` once with credentials, update memory, then retry the original idempotent/safely replayable request once.
5. If refresh fails, clear memory and show login.
6. Logout with credentials, then clear memory even if the network request fails.

```ts
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new HttpError(response.status, data);
  accessToken = data.access_token;
  return data;
}

async function refresh(): Promise<boolean> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    accessToken = null;
    return false;
  }
  const data = await response.json();
  accessToken = data.access_token;
  return true;
}

export async function adminFetch(path: string, init: RequestInit = {}) {
  const execute = () => fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(!(init.body instanceof FormData) && init.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  let response = await execute();
  if (response.status !== 401) return response;

  refreshPromise ??= refresh().finally(() => { refreshPromise = null; });
  if (!(await refreshPromise)) return response;
  return execute();
}
```

The shared promise prevents a burst of expired requests from rotating the refresh cookie concurrently. Avoid automatic retries for checkout, create, delete, and file-upload requests unless the UI has explicit idempotency handling; the API does not accept an idempotency key.

On a fresh page, call refresh once to restore a session from the cookie, then `/auth/me`. A `403` from refresh/logout normally means the browser Origin does not match deployment configuration-not that the user lacks an admin role.

## Public reads and query parameters

Build URLs with `URLSearchParams`; repeat array keys rather than joining them:

```ts
const params = new URLSearchParams({
  page: "1",
  page_size: "12",
  category_id: "3",
  sort: "price_asc",
});
params.append("ids", "12");
params.append("ids", "19");

const response = await fetch(`${API_URL}/products/?${params}`);
const products: Page<PublicProduct> = await response.json();
```

Public categories, brands, delivery areas, sliders, and products already exclude inactive data. Do not depend on admin data to decide public visibility. Debounce search input; reset `page` to 1 whenever search/filter/sort changes. Treat `items: []` as a normal empty state, not an error.

For simple products, `has_selectable_variants` is false and the single public variant has no name fields. Add that variant ID to the cart directly. For selectable products, require the shopper to choose an active returned variant. Never send a price from the cart to checkout; display estimates only and use the checkout response as the authoritative total.

Choose the image with `is_primary=true`, falling back to the first image or a UI placeholder. Prefix `image` with the API origin. Categories use the same rule with their embedded `images` array, which may be empty.

## Forms and validation

Client validation improves feedback but does not replace backend validation. Mirror these high-value rules:

- category/brand names: required, trimmed, maximum 100;
- slider titles: required, trimmed, maximum 200;
- delivery names: required, maximum 150; fee ≥ 0 with two decimals;
- product names: required, maximum 200; variant names maximum 100; SKU maximum 100;
- admin username 3–100, valid email ≤255, password ≥8 and ≤72 UTF-8 bytes;
- customer name ≤150;
- page/page size positive, page size ≤100;
- quantities are positive integers;
- phone is a supported Palestinian mobile form and will be normalized by the API.

For PATCH, send only changed fields. Do not send `null` for required fields; descriptions and SKU are the intentional nullable exceptions. Backend `422` remains authoritative for types, limits, and unknown fields.

Map validation errors using `detail[].loc`; for example `['body','name_en']` belongs to the `name_en` input and `['query','page']` belongs to pagination. A string `detail` is a form/global message.

## Uploads

Do not set `Content-Type` manually for `FormData`; the browser must add the multipart boundary.

```ts
export async function uploadProductImages(productId: number, files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const response = await adminFetch(`/products/${productId}/images`, {
    method: "POST",
    body,
  });
  return parseResponse(response);
}

export async function uploadCategoryImages(categoryId: number, files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const response = await adminFetch(`/categories/${categoryId}/images`, {
    method: "POST",
    body,
  });
  return parseResponse(response);
}

export async function createSlider(input: {
  title_ar: string;
  title_en: string;
  display_order: number;
  is_active: boolean;
  image: File;
}) {
  const body = new FormData();
  body.set("title_ar", input.title_ar);
  body.set("title_en", input.title_en);
  body.set("display_order", String(input.display_order));
  body.set("is_active", String(input.is_active));
  body.set("image", input.image);
  return parseResponse(await adminFetch("/sliders/", { method: "POST", body }));
}
```

Accept common browser image types for UX, but expect the backend to decode content rather than trust MIME/extensions. Show `400` image messages. After replacement/deletion, update URLs from the response and invalidate cached images if necessary.

## Checkout

```ts
interface CheckoutRequest {
  customer_name: string;
  customer_phone: string;
  delivery_area_id: number;
  address: string;
  notes?: string | null;
  items: Array<{ product_variant_id: number; quantity: number }>;
}

async function checkout(payload: CheckoutRequest) {
  return parseResponse(await fetch(`${API_URL}/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}
```

Merge duplicate cart lines before submitting because repeated variant IDs are rejected. Disable the submit button from the first click until the request resolves. Do not retry automatically after a timeout: the request may have committed even if the response was lost. Ask the customer to check history before resubmitting. Render server totals and order number on success and clear the cart only after `201`.

The `201` body also contains `history_access_token` and `history_access_token_expires_in`. Offer a "Download invoice" button on the success screen and request `GET /orders/history/invoice` with that token, then save the returned blob locally. A button is preferable to an automatic download because browsers routinely block programmatic downloads that are not user-initiated. Keep the token in component state only, show a pending state while the PDF is generated, and explain that the link expires. Do not call the order-history verification endpoint again just to download the invoice the customer just placed.

Catalog availability can change between browsing and checkout. Treat an unavailable-item `422` as a prompt to refresh the cart/catalog. A delivery area can similarly become inactive.

## Order history

Verification requires both the phone and the order number. Submit them to the verification endpoint, keep the returned token in memory only, and immediately exchange it for the verified order:

```ts
const verification = await fetch(`${API_URL}/orders/history/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone, order_number: orderNumber }),
});
// verification.ok -> { access_token, token_type: "Bearer", expires_in }

const response = await fetch(`${API_URL}/orders/history`, {
  headers: { Authorization: `Bearer ${access_token}` },
  cache: "no-store",
});
```

Both calls must bypass the admin API client and its refresh interceptor; this token is not an admin credential and must not be attached to other requests. The response contains the full verified order - customer name and phone, delivery area and address, notes, line items, and totals — so render it directly in the order-details card. A `404` is identical for a wrong phone, an unknown order, and a phone with no orders, so show one generic message. A `429` means verification was rate limited; honor `Retry-After`. On `401`, clear the in-memory token and ask the customer to verify again. Never persist the phone/order credentials or the token in `localStorage` or `sessionStorage`, and never include them in analytics. Tokens expire after `expires_in` seconds (10 minutes by default).

The same token can download the verified order's invoice from `GET /orders/history/invoice` (`responseType: "blob"`). Offer this as a "Download invoice" button on the order-details card, show a pending state while the PDF is generated, and report failures with a retry toast. The endpoint ignores any order-selection parameters and derives the order from the token, so a token for one order cannot retrieve another. Use the filename from `Content-Disposition` when present and always revoke the object URL after saving.

## Admin orders and invoices

Admin order filters are ordinary query parameters: `status`, `delivery_area_id`, `date_from`, `date_to`, `min_total`, `max_total`, `search`, `sort_by`, `sort_order`, `page`, and `page_size`. Dates use `YYYY-MM-DD` and ranges must be ordered.

Status controls should expose only valid next states:

- pending → confirmed or cancelled
- confirmed → out_for_delivery or cancelled
- out_for_delivery → delivered or cancelled
- delivered/cancelled → terminal

The server is authoritative and may return `409` when another administrator changed the order. Refresh the order after a conflict. Repeating the current status is accepted and returns the current order.

Download invoices as blobs. Pass `lang=en|ar` to match the active UI language:

```ts
export async function downloadInvoice(orderId: number, language: 'en' | 'ar') {
  const response = await adminFetch(`/orders/admin/${orderId}/invoice?lang=${language}`);
  if (!response.ok) throw new HttpError(response.status, await readJson(response));
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const name = disposition?.match(/filename="([^"]+)"/)?.[1] ?? `invoice-${orderId}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

## Dashboard

Request `/dashboard/stats?period=day|week|month|year|all`. Treat every subtotal/value/revenue field as a decimal string. `delivered_revenue` is delivered orders only; `cancelled_order_value` is separate. Empty periods legitimately return zero values and no recent orders.

## Cache invalidation

Every mutation should invalidate the caches whose data it changed. With TanStack Query, invalidating an active query refetches it immediately even when `staleTime` has not elapsed, so this is what keeps the admin dashboard and lists current without polling.

- Product create/update/delete: product lists and details, plus dashboard totals. Order items embed current product and variant names, so refresh order lists/details too.
- Variant changes: the product's variant list, product lists/details, dashboard totals, and orders.
- Image changes: the product gallery, product lists/details. Category image changes also refresh the category lists that embed them. Dashboard totals do not count images.
- Category/brand changes: their own lists, product lists/details (they embed category/brand summaries), and dashboard totals.
- Sliders, admins, customers: their own lists and dashboard totals.
- Delivery areas: area lists plus orders (orders embed area names).
- Checkout: orders, customers, and dashboard totals.
- Order status changes: the order detail (set the mutation result directly), order lists, and dashboard totals.

Prefer a small shared helper module over repeating raw `queryKey` arrays in every hook. Use prefix invalidation for keyed lists (for example `["ORDERS"]`) so every page/filter combination refreshes, and avoid polling the dashboard as a substitute for invalidation.

## Error, loading, and retry policy

```ts
async function readJson(response: Response): Promise<any> {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return { detail: response.statusText };
  return response.json();
}

class HttpError extends Error {
  constructor(public status: number, public payload: ApiError) {
    super(typeof payload.detail === "string" ? payload.detail : "Request validation failed");
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return undefined;
  const data = await readJson(response);
  if (!response.ok) throw new HttpError(response.status, data);
  return data;
}
```

- `401`: try one coordinated refresh for admin calls; otherwise show login.
- `403`: show a deployment/permission error; do not loop refresh.
- `404`: show not found; public inactive resources intentionally look missing.
- `409`: show the backend message and refresh affected state.
- `422`: bind field errors; keep entered values.
- `429`: honor `Retry-After` if the production proxy adds rate limiting.
- `5xx`: show a generic retry option and log a client correlation context without credentials/tokens/phone data.
- Network failure/timeout: distinguish from an HTTP error. Retry idempotent GETs with bounded exponential backoff; do not blindly replay mutations.

Every page should model loading, successful-empty, successful-data, validation/conflict, authentication, server, and offline states separately. Abort stale searches with `AbortController`. Never log passwords, Bearer tokens, cookies, or full checkout/history payloads.
