# Persistent storefront catalogue randomization

## Scope

Public product discovery uses a deterministic order for a persistent browser identity. Shop's Discover option, Home and About product sections, and product-detail recommendations opt in. Admin lists, cart product resolution, checkout, and individual-product reads do not change.

Category randomization is a presentation-only operation on Home and About. Shop category filters and the category bar, product-detail category information, and every admin category list keep their existing order. General category endpoints and React Query cache entries are not shuffled.

## Identity and persistence

A dedicated `ihmom-catalog-seed-v1` localStorage entry stores 16 cryptographically random bytes encoded as 32 lowercase hexadecimal characters. The seed is not authentication data and does not grant access to anything. It is independent of `ihmom-cart` and is never derived from cart contents.

The frontend validates a stored seed, generates one only when no valid seed exists, and reuses it in memory. Refreshes and navigation reuse persisted storage; changing search, filters, language, page, or sorting does not regenerate it. Clearing browser site data creates a new identity on the next visit. Separate browser profiles can have different orderings; tabs normally share the same localStorage identity.

When browser storage is unavailable, an in-memory seed keeps the current document stable. Persistence across refreshes cannot be guaranteed in that case. Concurrent first-ever tab initialization is not a transactional operation: tabs can initially resolve different seeds, but each document must retain its own resolved ordering rather than switch during pagination.

## Public API

Existing endpoints are extended rather than duplicated:

- `GET /products/`
- `GET /products/{product_id}/recommendations`

Optional query parameters:

| Parameter | Default | Meaning |
| --- | --- | --- |
| `randomize` | `false` | Enable deterministic randomized ordering |
| `random_seed` | omitted | Exactly 32 lowercase hexadecimal characters; required when randomization is enabled |

Example query string:

```text
/products/?randomize=true&random_seed=0123456789abcdef0123456789abcdef&page=2&page_size=20
```

Missing or malformed seeds for enabled randomization produce a validation error. A supplied seed is validated even when randomization is disabled, but it does not influence normal ordering. Randomization parameters are not supported on admin listing endpoints.

When enabled, randomized ordering takes precedence over normal sort fields. When disabled, the existing sort fields, directions, tie-breakers, filtering, response schema, and pagination remain unchanged.

## Database execution

The public visibility rules still require active products, categories, brands, and eligible active variants. Search, category, brand, ID, and price filters are applied before ordering. SQLAlchemy binds the seed as a parameter; it is not interpolated into SQL.

The effective product order is:

```sql
ORDER BY md5(:random_seed || ':' || products.id::text), products.id
```

The ID is a deterministic unique tie-breaker. Existing offset/limit pagination is applied after ordering. The total-count query does not calculate randomized ordering. Existing page-size/page-number limits and relationship loading remain in place.

Recommendations retain their existing same-category relevance preference. Within relevance groups, enabled randomization uses the seed hash and ID. Disabled recommendations retain their previous created-date and ID ordering. Recommendation relevance means their sequence is not necessarily the same as the main catalogue sequence.

No database migrations, persistent random columns, per-customer rank tables, or additional services are required.

## Frontend and cache behavior

Public callers explicitly opt in; the generic public API remains nonrandomized by default. The public hook resolves the seed before constructing both the request and its React Query key. Seed, mode, pagination, search, and filters therefore distinguish randomized responses. Disabled requests omit the seed to avoid duplicate cache entries for equivalent normal listings.

Admin requests retain their independent types, endpoints, and cache namespace. Product invalidation continues to invalidate affected public/admin data without moving one response into another cache entry. Previous-page placeholders must not cross seed or randomized/normal-mode boundaries.

Shop exposes Discover as the randomized default. Selecting newest, oldest, name, or price disables randomization and preserves the existing normal sorting behavior. Returning to Discover uses the original seed. Filter and sorting changes reset the page, not the identity.

Home makes one randomized product-page request and splits the result into its existing sections without a second product shuffle or a preliminary count-only fetch. Products are not duplicated across those sections. Existing response totals power statistics. About opts its product section into the same identity.

## Category randomization

Home and About each shuffle a copy of their existing fetched category page with a deterministic numeric seed derived from the browsing seed. The small presentation array is memoized. The shared query response is never mutated.

This changes the order of the fetched subset, not selection across the complete category database. It intentionally does not fetch extra category pages, introduce API parameters, or change ordering on Shop, product-detail, or admin pages. An empty or single-category array needs no special network behavior.

The old random-page selection helper and per-visit `Math.random()` product selection are removed. The remaining seeded shuffle utility is for category presentation, not paginated products.

## Performance and alternatives

For N matching rows, MD5 requires approximately O(N) hash evaluations per uncached request. PostgreSQL may choose a bounded top-N sort or a full sort depending on its plan, offset, and limit. A bounded sort can cost approximately O(N log K), where K is offset plus page size; a full sort is approximately O(N log N). Sort memory depends on retained rows and tuple width; large sorts can spill to temporary disk.

Applicable indexes can help filtering and joins, but a normal ID index cannot supply arbitrary per-browser hash ordering. Deep offset pages repeat hashing/sorting work and become more expensive. Existing React Query freshness avoids some repeated requests, not computation for every different page or filter.

No entire catalogue is transferred to browser or Python memory. The implementation adds no count query, extra product-page request, Python sort, or server-side per-seed cache. Category work is O(C) time and memory for the small already-fetched category array.

Alternatives considered:

| Approach | Trade-off |
| --- | --- |
| PostgreSQL numeric hashing | May reduce hash CPU and sort-key memory, but still scans/sorts and internal hash stability across database versions is weaker |
| Seeded ID pivot/rotation | Can use indexed ranges but rotates largely unchanged ID sequences rather than mixing the catalogue |
| Precomputed indexed ranks/cohorts | Faster reads but adds persistent data/indexes and limits identity-specific variety |
| Frontend/Python whole-catalogue shuffle | Excessive transfer/memory; page-only shuffling cannot randomize global pagination |
| `ORDER BY random()` | Different requests generate different orders and can overlap or omit page items |

If performance becomes unacceptable, measure first with `EXPLAIN (ANALYZE, BUFFERS)` on an approved representative test database. Compare normal/randomized ordering, broad and selective filters, first and deep pages, and concurrent distinct seeds. Inspect latency, sort method, temporary disk usage, buffer reads, and join plans. Optimize measured bottlenecks before proposing indexed shuffle cohorts or changing pagination. No production latency target or benchmark result is implied here.

## Consistency boundaries

For the same seed and unchanged matching dataset, repeated requests return the same order. Filters preserve surviving products' relative hash order. Different seeds can produce different sequences, but tiny datasets can coincidentally match.

A seed is not a catalogue snapshot. Inserts, deletions, visibility changes, or price/filter eligibility changes can shift offset boundaries between requests. Preventing that requires a separately designed snapshot/cursor strategy. Persisting a seed also does not persist Shop filter controls or the selected page beyond their existing URL/state behavior.

## Verification

Relevant checks cover deterministic ordering, distinct seeds, page overlap, filter-relative order, disabled sorting, invalid seeds, public/admin isolation, seed persistence and storage failures, immutable category shuffling, and storefront cache identity.

Frontend commands (from `Ihmom-StoreUI`):

```sh
npm test
npx tsc -b
npm run lint
npm run build
```

Backend integration tests use the disposable PostgreSQL/Redis environment documented in `Ihmom-StoreAPI/tests/README.md`, never a development or production database. From `Ihmom-StoreAPI`, after explicitly starting that test environment:

```sh
python -m pytest tests/integration/test_products.py
```

Verification performed:

- Seven focused frontend randomization tests passed without mocked API responses (`npm test -- --run tests/unit/catalog-randomization.test.tsx`).
- Frontend production build and TypeScript checks passed. Lint completed with seven unrelated warnings.
- Backend schema validation, bound PostgreSQL SQL compilation, OpenAPI public/admin parameter separation, Python syntax compilation, and collection of 53 product tests passed.
- Browser checks confirmed the same seed on refresh/navigation and search/category-filter changes, Discover requests carrying the seed, Newest requests disabling randomization and omitting the seed, and unchanged cart storage. Home requested one distinct product page and one category page; failed requests retried under existing query settings.

Docker and the isolated PostgreSQL/Redis services were unavailable. Backend integration tests were collected but not executed; SQL ordering, populated pagination, category rendering, and checkout could not be verified end to end. No performance benchmark was run. Real database and checkout integration results must not be inferred from frontend or compilation checks.
