# Ihmom Store UI

React, TypeScript and Vite storefront/admin dashboard with Arabic/English
translations, RTL/LTR layouts, TanStack Query, React Hook Form and the existing
Base UI component system. React Compiler is enabled in `vite.config.ts`.

## Development

Run npm commands in `Ihmom-StoreUI/`:

```powershell
npm.cmd ci
npm.cmd run dev
```

The root development Compose configuration is the supported full-stack setup.
See the [project README](../README.md) for services and environment configuration.

`VITE_API_URL` overrides the API base. Development otherwise uses
`VITE_DEVELOPMENT_API_URL`, with localhost:8000 as its fallback. For a same-origin
`/api` base, the Vite proxy strips the prefix, rewrites the refresh-cookie path,
and forwards media below `/uploads`. Configure the proxy target using
`VITE_DEVELOPMENT_API_PROXY_TARGET`.

## Production

`Dockerfile.prod` installs the locked frontend dependencies and builds with
`VITE_API_URL`. Nginx serves the SPA, forwards `/api/` to the existing API
service and serves proxied uploads. Deep links use the SPA fallback.
The root `docker-compose.prod.yml` and existing deployment command are preserved.

## Validation

```powershell
npm.cmd test
npx.cmd tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
```

Browser tests require isolated backend services; see [tests/README.md](tests/README.md).
The [frontend audit report](FRONTEND_TEST_REPORT.md) records the earlier functional
audit. [CLEANUP_REPORT.md](../CLEANUP_REPORT.md) records this repository cleanup.

Live icons and illustrations remain in `public/`; application assets remain
in `src/assets/`. Test fixtures remain under `tests/` and are excluded from
Docker build contexts. Generated bundles, caches and browser results are ignored.

Category reads return a single nullable `image` URL. The dashboard uses
`PUT /categories/{id}/image` with one multipart `image` file to upload/replace
it and `DELETE /categories/{id}/image` to remove it. Both return the updated
category; public and administrative category lists are invalidated after changes.
Product image galleries remain separate and unchanged.
