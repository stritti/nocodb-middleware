# TODO / Status (bereinigt)

Diese Datei ersetzt die frühere, veraltete Checkliste.

## Quelle der Wahrheit

Die laufende Planung liegt in OpenSpec unter:

- `openspec/changes/build-nestjs-nocodb-v3-middleware/`
- `openspec/changes/secure-token-proxy-and-configurable-cors/`
- `openspec/changes/add-user-management-with-superadmin-bootstrap/`
- `openspec/changes/developer-managed-table-crud-permissions/`
- `openspec/changes/nocodb-native-system-tables-standard-fields/`

## Bereits vorhanden im Code (High-Level)

- `DatabaseInitializationService`
- `PermissionsService`, `PermissionsGuard`, Permissions Decorators
- `PermissionsManagementController` + Service
- `RolesService`, `UserRolesService`
- Health Endpoint (`/health`)
- Dockerfile + docker-compose

## Hauptpunkte, die noch offen sind

- Konsistente V3-Ausrichtung (aktuell Hybrid v2/v3)
- CORS restriktiv-konfigurierbar statt global offen
- LTAR-first Relationsmodell durchgängig in Init + Services
- Konsistente Runtime-Konfiguration (`NOCODB_BASE_ID` in allen Deploy-Varianten)
- Container-Härtung + Healthcheck im Containerbetrieb
- Test-Bereinigung in `nocodb-v3.service.spec.ts` und `database-initialization.service.spec.ts`

## Nächster Schritt

OpenSpec-Tasks pro Change sequenziell abarbeiten (Master-Reihenfolge wurde bereits definiert: Security → Schema → User/SuperAdmin → Permissions/Enforcement).
