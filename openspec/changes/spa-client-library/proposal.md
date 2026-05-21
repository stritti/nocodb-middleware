## Why

SPA developers (Angular, Vue.js, React) who consume the NocoDB Middleware API must
hand-craft HTTP calls, manage JWT token refresh cycles, and handle typed responses
themselves – friction that slows adoption and introduces subtle bugs. A purpose-built
TypeScript client library abstracts all of this behind a clean, framework-agnostic API
so frontend teams can integrate in minutes rather than hours.

## What Changes

- **New package** `client/` inside the monorepo – a zero-dependency (except `axios`)
  TypeScript library published as `nocodb-middleware-client`.
- Typed method wrappers for every Middleware endpoint: auth, records (CRUD + list/filter),
  table catalog, permissions, roles, users, and health.
- Automatic JWT access-token refresh via an Axios interceptor (transparent to callers).
- Framework-agnostic: works with Angular, Vue.js, React, Svelte, or plain TypeScript.
- Build output as both ESM and CommonJS so bundlers and Node.js tests all work.
- Barrel re-exports and full JSDoc so IDEs provide autocomplete out of the box.

## Capabilities

### New Capabilities

- `client-core`: Base `NocodbMiddlewareClient` class, Axios instance setup, configurable
  base URL / token storage, and error normalisation.
- `client-auth`: `AuthService` wrapping `/auth/signin`, `/auth/signup`, `/auth/refresh`,
  `/auth/logout`, and `/auth/profile` with automatic token refresh interceptor.
- `client-records`: `RecordsService` wrapping the CRUD + list/filter operations for any
  table (`create`, `read`, `update`, `delete`, `list`, `findOne`).
- `client-admin`: Thin wrappers for permissions, roles, user-provisioning, and
  table-catalog endpoints (admin use-cases).

### Modified Capabilities

## Impact

- New `client/` directory at the repository root; does not touch existing NestJS source.
- New `package.json` for the client package, `tsconfig.json`, and rollup/tsc build config.
- README updated with a "Client Library" section and quick-start snippet.
- No breaking changes to the Middleware API itself.
