## 1. Project Scaffold

- [ ] 1.1 Create `client/` directory at repository root with `package.json` (name: `nocodb-middleware-client`, peerDep on `axios >=1.0.0`)
- [ ] 1.2 Add `client/tsconfig.json` base config and `client/tsconfig.esm.json` / `client/tsconfig.cjs.json` build targets
- [ ] 1.3 Add `client/.eslintrc.json` extending the root ESLint config
- [ ] 1.4 Add Jest config inside `client/package.json` for unit tests

## 2. Core Infrastructure

- [ ] 2.1 Implement `src/types.ts` – `ClientConfig`, `TokenPair`, `TokenStorage`, `PageInfo`, `MiddlewareError`
- [ ] 2.2 Implement `src/token-storage.ts` – default in-memory `InMemoryTokenStorage` implementing `TokenStorage`
- [ ] 2.3 Implement `src/http-client.ts` – create Axios instance, attach Authorization header interceptor, attach 401-refresh interceptor with `_isRetry` guard
- [ ] 2.4 Write unit tests for `MiddlewareError` mapping and the refresh interceptor logic

## 3. AuthService

- [ ] 3.1 Implement `src/services/auth.service.ts` with `signIn`, `signUp`, `refresh`, `logout`, `getProfile`
- [ ] 3.2 Write unit tests for `AuthService` covering all scenarios in `specs/client-auth/spec.md`

## 4. RecordsService

- [ ] 4.1 Implement `src/services/records.service.ts` with `list`, `read`, `create`, `update`, `delete`, `findOne`
- [ ] 4.2 Write unit tests for `RecordsService` covering all scenarios in `specs/client-records/spec.md`

## 5. AdminService

- [ ] 5.1 Implement `src/services/admin.service.ts` with `listTables`, `listRoles`, `createRole`, `setTablePermissions`, `createUser`, `healthCheck`
- [ ] 5.2 Write unit tests for `AdminService` covering all scenarios in `specs/client-admin/spec.md`

## 6. Façade & Barrel Exports

- [ ] 6.1 Implement `src/client.ts` – `NocodbMiddlewareClient` class with `.auth`, `.records`, `.admin` getters
- [ ] 6.2 Implement `src/index.ts` – re-export everything public
- [ ] 6.3 Write unit tests for façade instantiation and error on missing `baseUrl`

## 7. Build & Lint

- [ ] 7.1 Add `build`, `build:esm`, `build:cjs`, `lint`, `test` npm scripts to `client/package.json`
- [ ] 7.2 Verify ESM build produces `dist/esm/index.js` with `.mjs`-compatible output
- [ ] 7.3 Verify CJS build produces `dist/cjs/index.js`
- [ ] 7.4 Run `npm run lint` and `npm run test` inside `client/` – all pass

## 8. Documentation

- [ ] 8.1 Write `client/README.md` with installation, quick-start for Angular, Vue, and React, and API reference table
- [ ] 8.2 Update root `README.md` with a "Client Library" section pointing to `client/README.md`
