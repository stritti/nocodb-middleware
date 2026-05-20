## Context

Das Projekt hat bereits ein vollständiges Pagination-System:
- `PageOptionsDto`: `page`, `take`, `skip`, `sort`, `where`
- `PageMetaDto`: `page`, `take`, `itemCount`, `pageCount`, `hasPreviousPage`, `hasNextPage`
- `PageDto<T>`: `data: T[]`, `meta: PageMetaDto`
- `BaseRepository.findMany()`: Nutzt bereits alle Page-Parameter

Die Admin-Controller (`PermissionsManagementController`) verwenden jedoch direkt die Service-Methoden ohne Pagination.

## Goals / Non-Goals

**Goals:**
- `GET /admin/permissions/roles` → paginiert (RolesService.getAllRoles())
- `GET /admin/permissions/roles/:roleId/permissions` → paginiert (PermissionsManagementService.getRolePermissions())
- `GET /admin/permissions/users/:userId/roles` → paginiert (UserRolesService.getUserRoles())
- Default: page=1, take=20

**Non-Goals:**
- Keine Pagination für POST/PUT/DELETE-Endpoints
- Keine Änderung der Response-Struktur für Nicht-List-Endpoints
- Kein API-Versioning (Breaking Change wird im Changelog dokumentiert statt per Versionierung)

## Decisions

- **Services um Pagination erweitern**: `RolesService.getAllRoles(pageOptions)`, analog für PermissionsService und UserRolesService
- **Optional-Parameter**: `@Query()` mit Default-Werten für page/take
- **Response-Wrapper**: `PageDto<T>` als einheitliches Response-Format
- **Breaking Change akzeptieren**: Die Umstellung von `Array<T>` auf `{ data, meta }` ist ein API-Breaking-Change. Da die Admin-Endpoints primär von internen Tools genutzt werden, wird bewusst kein API-Versioning eingeführt. Der Breaking Change wird im Changelog dokumentiert.

## Risks / Trade-offs

- [Risk ⚠️ BREAKING] Clients, die das alte `Array<T>`-Format parsen, brechen mit dem neuen `{ data, meta }`-Format → Breaking Change im Changelog als Major dokumentieren; Clients müssen aktualisiert werden
- [Risk] `NocoDBService.list()` unterstützt bereits `limit`/`offset` → Pagination ist effizient umsetzbar
- [Risk] Kein API-Versioning → alle Clients müssen zeitnah migrieren
