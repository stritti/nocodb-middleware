## ADDED Requirements

### Requirement: Pagination für Rollen-Liste
`GET /admin/permissions/roles` SHALL Query-Parameter `page` und `take` unterstützen und eine paginierte Response im `PageDto`-Format zurückgeben.

#### Scenario: Rollen mit Pagination abrufen
- **GIVEN** es existieren 50 Rollen in der Datenbank
- **WHEN** `GET /admin/permissions/roles?page=1&take=10` aufgerufen wird
- **THEN** werden die ersten 10 Rollen zurückgegeben, `meta.pageCount: 5`, `meta.itemCount: 50`

#### Scenario: Default-Pagination
- **GIVEN** kein Query-Parameter wurde gesendet
- **WHEN** `GET /admin/permissions/roles` aufgerufen wird
- **THEN** wird `page=1`, `take=20` als Default verwendet

### Requirement: Pagination für Rollen-Permissions
`GET /admin/permissions/roles/:roleId/permissions` SHALL paginierte Ergebnisse zurückgeben.

#### Scenario: Permissions mit Pagination
- **GIVEN** eine Rolle hat 25 Table-Permissions
- **WHEN** `GET /admin/permissions/roles/1/permissions?page=2&take=10` aufgerufen wird
- **THEN** werden die Permissions 11–20 zurückgegeben

### Requirement: Pagination für User-Rollen
`GET /admin/permissions/users/:userId/roles` SHALL paginierte Ergebnisse zurückgeben.

#### Scenario: User-Rollen mit Pagination
- **GIVEN** ein Benutzer hat 12 Rollen
- **WHEN** `GET /admin/permissions/users/1/roles?take=5` aufgerufen wird
- **THEN** werden die ersten 5 Rollen zurückgegeben
