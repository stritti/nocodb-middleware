## Why

Die Middleware benötigt eine eigene, kontrollierte Benutzerverwaltung, um Rollen und Rechte unabhängig vom Frontend sicher durchsetzen zu können. Ein initialer SuperAdmin aus Umgebungsvariablen ermöglicht einen sicheren, reproduzierbaren Erstzugang für die Systemadministration.

## What Changes

- Einführung einer integrierten Benutzerverwaltung für Benutzer, Rollen und tabellenbezogene Rechte.
- Einführung eines Bootstrap-Mechanismus, der beim Initialstart optional einen SuperAdmin aus ENV-Werten erstellt.
- Einführung von API-Flows, mit denen ein authentifizierter SuperAdmin weitere Benutzer anlegen und verwalten kann.
- Definition von Passwort- und Aktivierungsregeln für lokale Benutzerkonten.
- Tests für Bootstrap, Rollen-/Rechtezuweisung und Berechtigungsdurchsetzung in Verwaltungsendpunkten.

## Capabilities

### New Capabilities
- `local-user-management`: Verwaltet lokale Benutzerkonten (Erstellen, Aktivieren/Deaktivieren, Rollen zuweisen).
- `role-and-permission-model`: Modelliert Rollen und Rechte zur Durchsetzung von Zugriffskontrollen.
- `superadmin-env-bootstrap`: Erstellt beim Start optional einen initialen SuperAdmin aus Umgebungsvariablen.

### Modified Capabilities
- Keine.

## Impact

- Betroffene Bereiche: `src/auth/*`, `src/users/*`, `src/roles/*`, `src/permissions/*`, `src/nocodb/database-initialization.service.ts` und zugehörige Tests.
- Sicherheit: Einführung eines privilegierten Bootstrap-Accounts mit restriktivem Zugriffsmodell.
- Betrieb: Neue ENV-Konfigurationen für SuperAdmin-Bootstrap und Passwortvorgaben.
- API: Zusätzliche Verwaltungsendpunkte für Benutzer-, Rollen- und Rechteverwaltung.