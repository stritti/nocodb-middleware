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
- Kein Breaking Change: Fehlende Query-Parameter bedeuten Default-Seite

## Decisions

- **Services um Pagination erweitern**: `RolesService.getAllRoles(pageOptions)`, analog für PermissionsService und UserRolesService
- **Optional-Parameter**: `@Query()` mit Default-Werten, abwärtskompatibel
- **Response-Wrapper**: `PageDto<T>` als einheitliches Response-Format

## Risks / Trade-offs

- [Risk] Clients, die auf das alte Array-Format angewiesen sind, müssen angepasst werden → Dokumentation des neuen Formats im Changelog
- [Risk] `NocoDBService.list()` unterstützt bereits `limit`/`offset` → Pagination ist effizient umsetzbar
