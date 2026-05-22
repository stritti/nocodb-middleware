## Context

The NocoDB Middleware is a NestJS server that wraps NocoDB with JWT-based auth, role-based
permissions, caching, rate limiting and observability. SPA developers currently have no
typed client and must write raw Axios/fetch calls, handle token refresh manually, and
construct filter strings by hand. The existing OpenAPI spec (`openapi.yaml`) at the
project root describes the full API surface.

The client library lives in a new `client/` sub-package inside the same repository. It
is TypeScript-first, framework-agnostic, and ships both ESM and CJS outputs so it works
with Angular DI, Vue composables, React hooks, and plain Node.js scripts alike.

## Goals / Non-Goals

**Goals:**

- Typed wrappers for every Middleware endpoint derived from the OpenAPI spec.
- Automatic JWT access-token refresh via an Axios response interceptor.
- Single `NocodbMiddlewareClient` façade that callers instantiate with a base URL and
  an optional initial token pair.
- Separate service classes (`AuthService`, `RecordsService`, `AdminService`) accessible
  via the façade for tree-shaking friendliness.
- Dual ESM + CJS build output produced by `tsc` (two `tsconfig` targets).
- Unit tests with Jest covering auth flow and records CRUD.
- A minimal `README.md` inside `client/` with installation and quick-start examples for
  Angular, Vue, and React.

**Non-Goals:**

- Reactive wrappers (Observables, Vue refs). Callers compose those from the returned
  Promises.
- Server-side rendering helpers (Next.js / Nuxt adapters).
- Bundling via Rollup/Webpack – plain `tsc` is sufficient for a library.
- Auto-generation of typed record models from table schemas (future enhancement).

## Decisions

### D1 – Axios as the HTTP layer

**Decision**: Use Axios (already in the main project's `dependencies`).

**Rationale**: Axios is already a declared dependency so no new package is required for
the monorepo consumer. Its interceptor API makes token-refresh logic straightforward and
deterministic. The `fetch` API would require a polyfill in Node.js < 18 and lacks
built-in retry/interceptor semantics.

**Alternatives considered**:
- `fetch` – cleaner but no interceptors; would need a wrapper library anyway.
- `ky` – smaller but an extra dep; less known in enterprise TS projects.

### D2 – Single façade + service objects

**Decision**: `new NocodbMiddlewareClient(config)` returns an object with `.auth`,
`.records`, `.admin` properties rather than a flat set of top-level functions.

**Rationale**: Mirrors the pattern used by Google and AWS SDKs. Callers can destructure
only the service they need, and Angular developers can provide individual services via
DI tokens without the full façade.

### D3 – Token storage strategy is caller-provided

**Decision**: The client accepts an optional `tokenStorage` object implementing
`{ get(): TokenPair|null; set(t: TokenPair): void; clear(): void }`. The default
in-memory store is fine for most SPAs; callers can plug in `localStorage` or a Pinia
store.

**Rationale**: Keeps the library free of browser/Node.js environment assumptions. A
hard-coded `localStorage` dependency would break SSR and Node tests.

### D4 – Interceptor-based transparent refresh

**Decision**: On 401, the interceptor calls `auth.refresh()` once, updates the stored
token, retries the original request, and rejects if refresh also fails.

**Rationale**: Standard pattern; callers see no 401s during normal operation. A single
mutex flag prevents concurrent refreshes from racing.

### D5 – Dual tsc build (ESM + CJS)

**Decision**: Two `tsconfig` files (`tsconfig.esm.json` → `dist/esm`, `tsconfig.cjs.json`
→ `dist/cjs`). `package.json` `exports` map selects the correct one.

**Rationale**: ESM for modern bundlers (Vite, Webpack 5) and CJS for Jest / older
tooling. No Rollup step needed since tsc handles it.

## Risks / Trade-offs

- **Drift from API**: As the Middleware evolves, client method signatures may lag.
  → Mitigation: The `openapi.yaml` is the source of truth; a CI script can lint that
  every operationId has a corresponding client method (future).

- **Circular-refresh loop**: If the backend issues a new 401 even after refresh, the
  interceptor would loop.
  → Mitigation: A `_isRetry` flag on the request config limits refresh to one attempt.

- **Axios version mismatch**: A consumer may depend on a different Axios version.
  → Mitigation: Declare Axios as a `peerDependency` with a broad range (`>=1.0.0`).

## Migration Plan

This is a net-new package; no migration needed. Consumers opt in by installing the
package. The existing Middleware API is unchanged.

## Open Questions

- Should the client package eventually be published to npm as
  `nocodb-middleware-client`? For now it is local-only; an npm publish script can be
  added later.
- Should we add an Angular `NgModule` / Vue plugin wrapper in a follow-up change?
