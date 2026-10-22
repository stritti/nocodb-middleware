## 1. Auth-Flow E2E Tests

- [x] 1.1 Test-Helper `createTestToken()` bereitstellen _(als `createAuthToken()` in test/auth.e2e-spec.ts)_
- [x] 1.2 Test: Request mit gültigem JWT → 200 OK _(#287)_
- [x] 1.3 Test: Request ohne Token → 401 Unauthorized _(#287)_
- [x] 1.4 Test: Request mit ungültigem (manipulierten) Token → 401 _(#287)_
- [x] 1.5 Test: Request mit abgelaufenem Token → 401 _(#287)_

## 2. RolesGuard E2E Tests

- [x] 2.1 Test-Controller mit `@Roles('admin')` Endpoint bereitstellen _(realer Endpoint `GET /api/meta/tables` mit `@Roles('admin')`)_
- [x] 2.2 Test: Request mit admin-Rolle → 200 OK
- [ ] 2.3 Test: Request ohne admin-Rolle → 403 Forbidden

## 3. PermissionsGuard E2E Tests

- [x] 3.1 `PermissionsService` im Test-Modul stubbeln (nicht den Guard selbst) _(Guard läuft real, NocoDB-Zugriff gemockt)_
- [x] 3.2 Test-Controller mit `@RequireRead('users')` Endpoint bereitstellen _(reale Admin-Endpunkte mit `@RequireRead`)_
- [x] 3.3 Test: `PermissionsService.canUserPerformAction` gibt `true` zurück → 200 OK (Guard-Logik läuft real) _(per Scope)_
- [x] 3.4 Test: `PermissionsService.canUserPerformAction` gibt `false` zurück → 403 Forbidden

## 4. CI-Integration

- [x] 4.1 CI-Config prüfen: E2E-Tests sind bereits in `test/e2e` integriert _(eigener Schritt `npm run test:e2e` im CI-Job `Test & Coverage`)_
- [x] 4.2 Sicherstellen, dass E2E-Tests in `npm test`-Workflow laufen
