## 1. Services um Pagination erweitern

- [ ] 1.1 `RolesService.getAllRoles()` akzeptiert `PageOptionsDto` und gibt `PageDto` zurück
- [ ] 1.2 `PermissionsManagementService.getRolePermissions()` akzeptiert `PageOptionsDto`
- [ ] 1.3 `UserRolesService.getUserRoles()` akzeptiert `PageOptionsDto`

## 2. Controller anpassen

- [ ] 2.1 `GET /admin/permissions/roles`: `@Query() pageOptions: PageOptionsDto` hinzufügen
- [ ] 2.2 `GET /admin/permissions/roles/:roleId/permissions`: Pagination-Query-Parameter
- [ ] 2.3 `GET /admin/permissions/users/:userId/roles`: Pagination-Query-Parameter

## 3. Breaking Change Dokumentation

- [ ] 3.1 Breaking Change im CHANGELOG als Major-Update dokumentieren
- [ ] 3.2 Migrationshinweis für Clients: Response-Format wechselt von `Array<T>` zu `{ data, meta }`

## 4. Tests

- [ ] 4.1 Unit-Tests: Pagination-Parameter werden korrekt an NocoDB weitergegeben
- [ ] 4.2 Unit-Tests: Default-Werte (page=1, take=20) bei fehlenden Query-Parametern
- [ ] 4.3 Unit-Tests: Response enthält `data` und `meta` mit korrekten Pagination-Werten
