# Ihmom Store frontend audit and regression report

Date: 2026-11-11. Platform: Windows PowerShell, Chromium, React/TypeScript/Vite,
FastAPI, disposable PostgreSQL 17 and Redis 8.2.

## Scope and evidence

Reviewed the router and guards, layouts, public catalog and product selection,
cart provider, checkout and guest history, admin authentication, resource API
services/hooks/types, management forms, shared validation and error helpers,
translations, loading/empty/error components, image utilities, and Vite/Nginx
configuration. Backend routes and Pydantic schemas were checked for auth,
products/variants, orders, taxonomy, sliders, customers, delivery, and pagination.
No backend business logic or security rule was changed during this frontend task.

Evidence below distinguishes browser automation against the real API, DOM/unit
tests with isolated adapters, and static inspection. Browser tests are automated
Chromium interactions; this was not an exhaustive manual visual review.

## Confirmed defects and implemented fixes

| Defect | Fix | Evidence |
|---|---|---|
| Retried authenticated requests retained the expired bearer | Replace the header with the refreshed token; share one concurrent refresh | Axios concurrency regression |
| A late refresh could restore authentication after logout | Reject results from an earlier authentication generation | Deferred-response regression |
| Session expiration left protected data cached | Clear the query cache on session expiration and logout | Code inspection; real protected routes/logout |
| Failed server logout was swallowed | Always clear local credentials/cache and propagate the server error to a translated toast | Axios failure regression |
| A second 401 after refresh did not notify auth state | Clear bearer and emit session-expired on the final 401 | Code inspection |
| Shared errors surfaced raw English backend details | Translate status-specific messages; suppress raw details and server exceptions | Arabic/English tests for 12 HTTP statuses and network failure |
| Backend 422 field errors were not mapped | Shared mapper for known body fields; wired into checkout, taxonomy, customer, delivery, slider, variant, product details and admin forms | Mapper regression; form inspection |
| Permanent 4xx query failures were repeatedly retried | Stop automatic query retries for all 4xx responses | Configuration inspection; shop error/retry interaction |
| Offline mutations could remain queued and disabled | Attempt mutations immediately and surface connection failures; keep mutation retries disabled | Configuration inspection |
| Invalid stored prices/non-finite quantities corrupted cart totals | Validate persisted prices and reject non-finite quantity changes | Cart DOM/provider tests |
| Admin email rejected surrounding whitespace accepted by backend | Trim before email validation | Schema boundary test |
| Changing shop category remounted and cleared other filters | Remount only when the URL search term changes | Browser search/category regression |
| Invalid product identifiers triggered avoidable API requests | Disable detail/recommendation queries for invalid identifiers | Hook inspection |
| Initial lazy routes could show a blank screen | Add a translated initial route loading fallback | Browser route matrix |
| About hero decoration caused mobile horizontal overflow | Clip the decorative effect within its section | Chromium 320px/390px reproduction and regression |
| Login lacked a semantic heading below desktop width | Render its form title as an h1 | Browser route inspection |
| Loading accessibility labels were hardcoded English | Translate both shared spinners | Translation inspection |
| Global error fallback required router context even for errors above the router | Use a normal home link and restrict diagnostic logging to development | Error-boundary DOM regression |
| All pages were loaded in the entry bundle | Lazy-load page modules through React Router | Production build and browser direct navigation |
| Development /api proxy forwarded an unsupported prefix | Strip /api and rewrite refresh cookie path to /api/auth | Real browser proxy login/refresh/logout |
| Relative API bases broke image URL resolution | Resolve the configured base against the browser origin | Relative-base asset URL regression |
| Production had no same-origin /api or upload proxy | Add Nginx API/upload routes and refresh-cookie path rewriting | Nginx container syntax check; deployment integration remains limited as noted below |

## Integration and business flows

Browser fixtures apply the real Alembic migrations and create only disposable
test admin/catalog data. Browser traffic goes through Vite's `/api` proxy to
FastAPI; PostgreSQL and Redis perform actual persistence and rate enforcement.

Browser coverage includes:

- Public home, shop, product detail, cart, checkout, guest history, About,
  Contact, customer care, delivery information, returns, FAQs, and admin login.
- Valid admin login, cookie refresh on page reload, protected dashboard and
  products/editor, categories, brands, sliders, customers, delivery, admins,
  and orders pages; logout returns to login.
- Category and brand forms: empty validation, bilingual entry, backend 201,
  dialog closure and updated list.
- Product addition, cart persistence after reload, delivery-area selection,
  review, checkout, order confirmation, guest verification and PDF download.
- Lost checkout response **after the real server has committed**, followed by
  the same-key retry; both responses identify the same order. This is not a
  mocked successful checkout.
- Shop error → explicit retry → empty → real-data success, and category changes
  preserving search input.

Public/admin product routes remain separate, public responses retain
`starting_price` and `has_selectable_variants`, upload URLs retain WebP paths,
and order displays use the existing item snapshot fields. These contracts were
also checked against backend code and its permanent suite.

## Validation and HTTP behavior

Unit tests cover accepted local/+970/+972 phones, malformed and strict quantity
values, empty/duplicate cart items, whitespace names, history normalization,
simple product/variant cross-field requirements, zero/negative/excessive prices,
decimal precision, trimmed email and the 72-byte password boundary.

The shared error tests exercise 400, 401, 403, 404, 409, 413, 422, 429, 500,
502, 503 and 504 in both languages, and network failure. Raw backend exception
text is never used as the shared user message. These are adapter/unit tests,
not production fault injection for each status. Checkout recovery uses an
actual failed browser connection after a database commit. Inputs survive
recoverable failures and mutation retries remain explicit.

## Responsive, language and accessibility results

The automated matrix uses 320, 390, 768, 1024 and 1440px widths. It checks
rendered content, direction and document horizontal overflow on the public
route list and nine admin resource pages, in English and Arabic. This measures
overflow and successful rendering; it does not establish pixel-perfect visual
quality, every dialog's geometry, color contrast, or complete keyboard access.

English translation leaf keys all have matching Arabic keys. Language
persistence and document direction are exercised through localStorage and real
page reloads, with additional unit tests switching the live i18n instance.
No messages were sent through mail/WhatsApp/external services.

## Automated results

- Unit/DOM/adapter tests: **35 passed, 0 failed, 0 skipped** across five files.
- Chromium browser tests: **16 passed, 0 failed, 0 skipped**. Combined frontend
  total: **51 passed, 0 failed, 0 skipped**. Failed intermediate assertions were
  investigated and corrected; the final full browser run passed.
- Backend rerun on a fresh disposable database: **193 passed, 0 failed, 0
  skipped**, including migrations, concurrency, security and complete API flows.
  Backend coverage was not remeasured in this frontend task; its earlier 87%
  measurement is not presented as a new run.
- Frontend coverage percentage: not measured; no coverage percentage is claimed.
- TypeScript: passed. ESLint: 0 errors, six existing React Hook Form/React
  Compiler compatibility warnings. Production build: passed.
- Nginx: `nginx -t` passed in a disposable `nginx:alpine` container.

## Performance

The previous main chunk was approximately 1,546 kB (480 kB gzip). The final
main chunk is **620.95 kB (194.83 kB gzip)**, about 60% smaller. This is a
main-chunk comparison, not a claim that the total application download shrank
by 60%; shared dependencies and page chunks load separately.
Charts and the location map remain separately loaded. The >500 kB warning
remains; no warning threshold was raised to conceal it.

## Limitations and remaining risks

- The browser matrix is a smoke/layout test, not proof of every button or every
  possible state on every page. Every admin CRUD permutation, upload replacement
  dialog, slider interaction, order status transition, focus trap and keyboard
  sequence was not browser-automated. Relevant backend behavior has separate
  permanent coverage.
- No Firefox, Safari, physical touch-device, assistive-technology or contrast
  audit was executed. 390px represents the requested 375/390 mobile class;
  375px was not separately run.
- Production Nginx syntax was executed, but a complete production image stack
  behind a deployed TLS reverse proxy was not started. External absolute API
  origins still require correct CORS and cookie deployment settings.
- Browser request failures are deliberately injected in recovery tests; external
  map/image requests can fail independently of the API. No claim is made that
  every external image/link is available or that every console message is absent.
- Some catalog selectors use `FETCH_ALL_PARAMS` with page size 100; stores
  exceeding 100 categories/brands/delivery areas need full collection retrieval
  or server-backed selector search. This boundary was identified by inspection
  and was not changed in this audit.
- The mail contact form prepares an email in the user's mail client. Delivery
  of that email was not tested and the application does not supply a messaging API.
- npm reported 20 dependency advisories (2 low, 15 moderate, 3 high). No forced
  runtime dependency upgrade was applied.
- Frontend schemas do not replace backend authority for uniqueness, active-state
  constraints, monetary totals or permissions. Field mapping deliberately uses
  translated safe messages rather than arbitrary server text.

## Rerunning and cleanup

See `tests/README.md` for PowerShell installation, unit/browser commands and safe
isolated-service startup/shutdown. Permanent tests, fixtures and configuration
remain in the repository. No commit or push was made.

Cleanup completed: removed the generated production `dist`, Playwright results,
npm download cache, Vite/Vitest and TypeScript build caches, pytest/Python
caches, known temporary upload directories, and disposable test containers and
network. Required npm packages and browser-test dependencies remain installed.
No persistent Docker volumes, application uploads or business records were
deleted. Existing unrelated workspace changes were preserved.
