## Why

Der Auth-Flow (JWT-Validierung, RolesGuard, PermissionsGuard) ist der sicherheitskritischste Pfad der Middleware. Aktuell wird er nur durch Unit-Tests abgedeckt. E2E-Tests mit Supertest können reale Szenarien wie Token-Manipulation, Ablauf, fehlende Rollen und Permission-Grenzfälle simulieren.

Die E2E-Test-Suite existiert bereits (`test/app.e2e-spec.ts`), deckt aber den Auth-Flow nicht ab.

## What Changes

- E2E-Tests für JWT-Authentifizierung (gültiger/ungültiger/abgelaufener Token)
- E2E-Tests für RolesGuard (erlaubte/verbotene Rollen)
- E2E-Tests für PermissionsGuard (Table-Level CRUD-Berechtigungen)
- Test-Helfer für JWT-Token-Generierung in Tests
- CI-Pipeline muss E2E-Tests ausführen

## Capabilities

### New Capabilities
- `auth-flow-e2e`: E2E-Test-Suite für den gesamten Authentifizierungs- und Autorisierungs-Flow.

### Modified Capabilities
- `test/` – erweiterte E2E-Test-Suite
- CI-Config – E2E-Test-Step

## Impact

- Nur Test-Code betroffen, keine Produktions-Änderungen
- Zusätzliche Laufzeit in CI (ca. 30s pro E2E-Durchlauf)
- Höhere Sicherheit durch reproduzierbare Integrationstests
