## Why

Der `PermissionsManagementController` listet Rollen, User-Rollen und Table-Permissions aktuell ohne Pagination. Bei vielen Rollen oder Benutzern (50+) werden alle Datensätze auf einmal geladen. Dies führt zu:

- Hohem Memory-Verbrauch auf Client- und Server-Seite
- Langsamen Response-Zeiten bei großen Datensätzen
- Fehlender UX bei Admin-Oberflächen (keine "nächste Seite"-Navigation)

Die `PageDto`/`PageOptionsDto`/`PageMetaDto`-Klassen existieren bereits im Projekt – sie müssen nur auf die Admin-Endpoints angewendet werden.

## What Changes

- Pagination auf `GET /admin/permissions/roles`
- Pagination auf `GET /admin/permissions/roles/:roleId/permissions`
- Pagination auf `GET /admin/permissions/users/:userId/roles`
- Query-Parameter: `page`, `take`, (optional) `sort`, `where`

## Capabilities

### New Capabilities
- `admin-pagination-support`: Pagination für alle List-Endpoints des Admin-Bereichs.

### Modified Capabilities
- `PermissionsManagementController` – neue Query-Parameter + PageDto-Responses
- Bestehende `PageDto`/`PageOptionsDto` werden wiederverwendet

## Impact

- API-Response-Format ändert sich von `Array<T>` zu `{ data: T[], meta: { page, take, itemCount, pageCount, hasPreviousPage, hasNextPage } }`
- Query-Parameter sind optional → kein Breaking Change für bestehende Clients (Default: page=1, take=20)
- Minimaler Implementierungsaufwand (DTOs existieren bereits)
