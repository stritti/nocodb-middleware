# Generic Resource Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execute inline in the existing workspace; do not create branches or commits.

**Goal:** Publish explicitly authorized NocoDB resources using database configuration instead of application-specific backend code.

**Architecture:** A resource registry validates a short-lived snapshot of three protected configuration tables. Public reads project configured fields, validate configured filters and check fresh anonymous table permissions before using cached responses. Existing authenticated data/admin APIs remain unchanged.

**Tech Stack:** NestJS, TypeScript, NocoDB v3, Jest/Supertest; Vue/TypeScript frontend with Vitest.

**Spec:** `docs/superpowers/specs/2026-11-16-generic-resource-registry-design.md` (approved by user).

## Global Constraints

- Resources and permissions are stored in NocoDB, not an application JSON file.
- Resource snapshot lifetime: 30 seconds; data response cache: 60 seconds.
- No anonymous permission cache; check access before every cached response.
- Default deny, no automatic public grants and no live database modifications.
- Preserve existing frontend resource paths and response shapes.
- List defaults: page 1, take 25; maximum take 50.
- No login/write migration, new admin UI, arbitrary expressions or row-level policy.
- Use installed Node 24.22.1 for backend commands after changing directory.
- Preserve existing worktree changes. Use apply_patch for manual edits.

## Task 1: Database-Configured Public Reads

**Files:** `test/public-read.e2e-spec.ts`, `src/public-read/resource-registry.service.ts`, `src/public-read/public-read.service.ts`, `src/public-read/public-read.controller.ts`, `src/public-read/public-read.module.ts`, `src/public-read/dto/public-read-query.dto.ts`, `src/permissions/permissions.service.ts`.

**Interfaces:** Registry exports `resolve(name: string): Promise<ConfiguredResource>` with resolved table ID/name, field/filter arrays and a configuration version. Permissions service exports `canAnonymousRead(tableName: string): Promise<boolean>` with fresh NocoDB queries. Public service exports `list(resource: string, query: Record<string, unknown>): Promise<PublicPage>` and `read(resource: string, id: number): Promise<PublicRecord>`.

- [x] Replace only the HTTP dependency fixtures with configuration/roles/permissions records; retain existing projection/pagination assertions. Add a new resource assertion:

  ```ts
  const response = await request(app.getHttpServer())
    .get('/api/public/inventory')
    .expect(200);
  expect(response.body.data).toEqual([{ id: 1, label: 'Spade' }]);
  ```

- [x] Run `npm run test:e2e -- --runInBand public-read.e2e-spec.ts`; verify missing generic behavior fails.
- [x] Implement registry loading over all pages; validate source metadata, names, duplicates, JSON, relationships and protected tables. Build snapshot version from validated configuration. Resolve only explicit enabled resource names.
- [x] Replace hardcoded public routes/DTO enums with generic paths, configured projection/defaults/normalization, strict page/filter validation and safe filter helpers. Check fresh `anonymous` role/read grant before cache access.
- [x] Rerun the same HTTP command. Add focused regressions for missing/duplicate configuration, config expiry/errors, revocation on cached data, required/invalid filters, malformed IDs and protected-table aliases. Run each regression red before its implementation.

## Task 2: Safe Bootstrap and Protected Tables

**Files:** `src/nocodb/database-initialization.service.ts`, its existing spec, `src/data/table-permissions.guard.ts`, its existing spec, `src/nocodb/table-catalog.service.ts`, its existing spec, shared system-table definition as needed.

**Interfaces:** A shared immutable set identifies all protected logical table names; initial table definitions continue exporting the existing `SYSTEM_TABLES` schema array for compatibility with its tests.

- [x] Add failing assertions that the three configuration tables are initialized, catalog-hidden and data-guard-denied, including wildcard-scoped users.
- [x] Run `npm test -- --runInBand database-initialization table-permissions.guard table-catalog`; confirm the new assertions fail.
- [x] Add generic schema fields from the spec and unprivileged `anonymous` role seeding, reuse a shared protected-table set, and retain existing admin system rights. Do not seed application resource rows.
- [x] Rerun the focused command and the public-read HTTP suite.

## Task 3: Frontend Contract, Operations and Release Checks

**Files:** frontend `src/services/middlewareService.ts`, `src/services/__tests__/middlewareServices.spec.ts`, `.env.local.example`, `docs/MIDDLEWARE-EINRICHTUNG.md`, `README.md`; backend `.env.example`, `docs/api.md`, `openapi.yaml`, `openapi.json`.

**Interfaces:** Frontend list resource becomes `string`, filters become `Record<string, string>`; existing domain service signatures remain valid.

- [x] Add a frontend HTTP test proving `getList('inventory', ..., { category: 'Tools' })` preserves response adaptation and emits only the generic URL/filter. Run the existing service spec red, then remove central application-specific type restrictions and rerun it.
- [x] Remove obsolete `WURZELPARTNER_*` backend environment entries. Document generic tables, anonymous rights, refresh/revocation, fail-closed semantics and manual migration. Put concrete application mappings only in the frontend setup guide, read its current user-edited contents before changing it.
- [x] Generate generic OpenAPI paths from the built application; preserve unrelated pre-existing spec content when synchronizing JSON.
- [x] Run scoped Prettier/ESLint, all backend unit and HTTP tests, frontend tests/typecheck/build, backend build with `npm exec tsc -- --project tsconfig.build.json --incremental false` and assert `dist/main.js` exists.
- [x] Review the diff against the design; record test evidence and live-validation limitations. Update this checklist as tasks finish.

## Execution Record

- Task 1: complete. Configuration-only inventory resource first failed with 404, then passed with the generic registry/controller. Public HTTP suite now has 69 tests.
- Task 2: complete. Seven bootstrap/guard/catalog assertions failed before the schema/protection update; focused suite then passed all 42 tests.
- Task 3: complete. Frontend path validation failed in three cases before the generic service update; all 27 frontend tests and typecheck/build now pass.
- Ruling: execute inline in the existing dirty workspace, without commits or branches, following the approved plan. Preserve all earlier integration/user changes.
- Ruling: identify protected targets from actual resolved metadata, including physical names, and require canonical logical titles on generic data access. This closes physical aliases without inventing a persistent system-ID database; arbitrary administrative renames of managed system tables are unsupported.
- Ruling: preserve decoded public query values through the global middleware because enum validation and quoted NocoDB filter serialization provide the applicable input boundary. Other routes retain their existing sanitization.
- Independent review found three Important issues: system-table aliases, missing HTTP cache policy, and HTML transformation of configured enum values. Each was reproduced by failing tests and corrected in one follow-up pass.
- Post-review checks: 423 backend unit tests in 46 suites; 119 HTTP tests in five suites; scoped ESLint/Prettier; complete TypeScript build with real dist/main.js.
- New public-read module coverage from its HTTP suite: 95.54% statements, 87.57% branches, 100% functions, 95.67% lines; enforced 80% statement/function/line thresholds. Coverage invoked from the repository root, not the e2e config's test-only root.
- Frontend production build succeeds with existing bundle-size and ineffective dynamic-import warnings; no UI behavior was changed.
- Generic OpenAPI YAML regenerated; only public paths synchronized into the historically older JSON to avoid unrelated schema churn.
- No live NocoDB requests, schema migration or anonymous grants were executed. Real table titles, token permissions, attachment URLs and proxy behavior still require deployment validation using the setup guide.
