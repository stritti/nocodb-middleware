## Why

Entwickler, die die Middleware nutzen, benötigen eine standardisierte Möglichkeit, Benutzern CRUD-Berechtigungen für ihre projektspezifischen NocoDB-Tabellen zu vergeben. Diese Berechtigungen müssen konsistent in NocoDB persistiert werden, damit Authorisierung reproduzierbar, auditierbar und deploymentsicher bleibt.

## What Changes

- Einführung eines Flows, mit dem Entwickler CRUD-Rechte pro Tabelle und Rolle/Benutzer definieren können.
- Persistierung der vergebenen Tabellenrechte im NocoDB-Schema (permissions-bezogene Tabellen/Struktur).
- Erweiterung der Berechtigungsprüfung, sodass Laufzeitentscheidungen auf den in NocoDB gespeicherten Rechten basieren.
- Einführung von APIs/Services für Setzen, Aktualisieren und Lesen tabellenbezogener CRUD-Berechtigungen.
- Tests für Vergabe, Persistenz und Enforcement von Tabellenrechten.

## Capabilities

### New Capabilities
- `developer-table-permission-management`: Ermöglicht Entwicklern das Vergeben und Verwalten von CRUD-Rechten für spezifische NocoDB-Tabellen.
- `nocodb-persisted-permission-schema`: Speichert Tabellenberechtigungen dauerhaft im NocoDB-Schema für konsistente Laufzeitprüfung.
- `table-crud-permission-enforcement`: Erzwingt CRUD-Zugriff anhand der in NocoDB gespeicherten Rechte zur Request-Zeit.

### Modified Capabilities
- Keine.

## Impact

- Betroffene Bereiche: `src/permissions/*`, `src/roles/*`, `src/users/*`, `src/nocodb/database-initialization.service.ts`, `src/nocodb/nocodb-v3.service.ts` und zugehörige Tests.
- API: Neue/erweiterte Endpunkte für tabellenbezogene Rechteverwaltung.
- Datenmodell: Persistente Rechteobjekte in NocoDB (z. B. table_permissions-Zuordnungen).
- Sicherheit: Feinere Zugriffskontrolle und konsistente Autorisierungsdurchsetzung über Middleware und Persistenz.