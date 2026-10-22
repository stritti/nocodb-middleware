## 1. Project Scaffold

- [x] 1.1 Create `client/` directory at repository root with `package.json` (name: `nocodb-middleware-client`, peerDep on `axios >=1.0.0`)
- [x] 1.2 Add `client/tsconfig.json` base config and `client/tsconfig.esm.json` / `client/tsconfig.cjs.json` build targets
- [x] 1.3 Add `client/.eslintrc.json` extending the root ESLint config _(nutzt die gemeinsame Root-Konfiguration `eslint.config.js`)_
- [x] 1.4 Add Jest config inside `client/package.json` for unit tests

## 2. Core Infrastructure

- [x] 2.1 Implement `src/types.ts` – `ClientConfig`, `TokenPair`, `TokenStorage`, `PageInfo`, `MiddlewareError` _(`PageInfo` in `records.service.ts`, exportiert)_
- [x] 2.2 Implement `src/token-storage.ts` – default in-memory `InMemoryTokenStorage` implementing `TokenStorage`
- [x] 2.3 Implement `src/http-client.ts` – create Axios instance, attach Authorization header interceptor, attach 401-refresh interceptor with `_isRetry` guard
- [x] 2.4 Write unit tests for `MiddlewareError` mapping and the refresh interceptor logic _(#290)_

## 3. AuthService

- [ ] 3.1 Implement `src/services/auth.service.ts` with `signIn`, `signUp`, `refresh`, `logout`, `getProfile` _(aktuell nur Token-Verwaltung (`setTokens`/`getTokens`/`clearTokens`))_
- [ ] 3.2 Write unit tests for `AuthService` covering all scenarios in `specs/client-auth/spec.md`

## 4. RecordsService

- [x] 4.1 Implement `src/services/records.service.ts` with `list`, `read`, `create`, `update`, `delete`, `findOne` _(Pfade `/data/{table}`, #290)_
- [x] 4.2 Write unit tests for `RecordsService` covering all scenarios in `specs/client-records/spec.md`

## 5. AdminService

- [x] 5.1 Implement `src/services/admin.service.ts` with `listTables`, `listRoles`, `createRole`, `setTablePermissions`, `createUser`, `healthCheck` _(#290)_
- [x] 5.2 Write unit tests for `AdminService` covering all scenarios in `specs/client-admin/spec.md` _(#290)_

## 6. Façade & Barrel Exports

- [x] 6.1 Implement `src/client.ts` – `NocodbMiddlewareClient` class with `.auth`, `.records`, `.admin` getters
- [x] 6.2 Implement `src/index.ts` – re-export everything public
- [x] 6.3 Write unit tests for façade instantiation and error on missing `baseUrl`

## 7. Build & Lint

- [x] 7.1 Add `build`, `build:esm`, `build:cjs`, `lint`, `test` npm scripts to `client/package.json`
- [x] 7.2 Verify ESM build produces `dist/esm/index.js` with `.mjs`-compatible output _(`check:package` in CI)_
- [x] 7.3 Verify CJS build produces `dist/cjs/index.js`
- [x] 7.4 Run `npm run lint` and `npm run test` inside `client/` – all pass _(CI-Job `Client Library`)_

## 8. Documentation

- [x] 8.1 Write `client/README.md` with installation, quick-start for Angular, Vue, and React, and API reference table
- [x] 8.2 Update root `README.md` with a "Client Library" section pointing to `client/README.md`
