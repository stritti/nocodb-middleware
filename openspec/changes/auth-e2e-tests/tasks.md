## 1. Auth-Flow E2E Tests

- [ ] 1.1 Test-Helper `createTestToken()` bereitstellen
- [ ] 1.2 Test: Request mit gültigem JWT → 200 OK
- [ ] 1.3 Test: Request ohne Token → 401 Unauthorized
- [ ] 1.4 Test: Request mit ungültigem (manipulierten) Token → 401
- [ ] 1.5 Test: Request mit abgelaufenem Token → 401

## 2. RolesGuard E2E Tests

- [ ] 2.1 Test-Controller mit `@Roles('admin')` Endpoint bereitstellen
- [ ] 2.2 Test: Request mit admin-Rolle → 200 OK
- [ ] 2.3 Test: Request ohne admin-Rolle → 403 Forbidden

## 3. PermissionsGuard E2E Tests

- [ ] 3.1 `PermissionsService` im Test-Modul stubbeln (nicht den Guard selbst)
- [ ] 3.2 Test-Controller mit `@RequireRead('users')` Endpoint bereitstellen
- [ ] 3.3 Test: `PermissionsService.canUserPerformAction` gibt `true` zurück → 200 OK (Guard-Logik läuft real)
- [ ] 3.4 Test: `PermissionsService.canUserPerformAction` gibt `false` zurück → 403 Forbidden

## 4. CI-Integration

- [ ] 4.1 CI-Config prüfen: E2E-Tests sind bereits in `test/e2e` integriert
- [ ] 4.2 Sicherstellen, dass E2E-Tests in `npm test`-Workflow laufen
