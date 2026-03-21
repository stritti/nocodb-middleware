## Why

Systemtabellen für Benutzer, Rollen und Berechtigungen sollen in NocoDB mit den typischen, UI-freundlichen Feldtypen und Bezeichnungen umgesetzt werden. Dadurch können Entwickler und Admins diese Daten direkt in der gewohnten NocoDB-Oberfläche pflegen, ohne Middleware-internes Sonderwissen.

## What Changes

- Einführung eines NocoDB-nativen Schemas für Systemtabellen (Users, Roles, User Roles, Table Permissions) mit üblichen Feldtypen.
- Verwendung UI-kompatibler Standardfelder (z. B. SingleLineText, Email, Checkbox, DateTime, Relationen) für bessere Editierbarkeit.
- Anpassung der Initialisierung, damit Tabellen/Spalten in dieser standardisierten Form idempotent bereitgestellt werden.
- Sicherstellung, dass Berechtigungs- und Benutzerverwaltung mit dem neuen Feldmodell kompatibel bleibt.
- Tests für Schemaanlage, Feldkonsistenz und Bearbeitbarkeit über NocoDB-Oberfläche.

## Capabilities

### New Capabilities
- `nocodb-native-system-schema`: Definiert ein NocoDB-natives, UI-freundliches Feldmodell für alle Systemtabellen.
- `idempotent-system-table-provisioning`: Stellt sicher, dass Systemtabellen und Standardfelder beim Start deterministisch und ohne Duplikate bereitgestellt werden.
- `ui-compatible-permission-data-model`: Sichert, dass Rechte- und Benutzerdaten in der NocoDB-Oberfläche direkt les- und bearbeitbar sind.

### Modified Capabilities
- Keine.

## Impact

- Betroffene Bereiche: `src/nocodb/database-initialization.service.ts`, `src/nocodb/nocodb-v3.service.ts`, `src/permissions/*`, `src/users/*` und zugehörige Tests.
- Datenmodell: Feldnamen/-typen in Systemtabellen werden auf NocoDB-übliche Darstellungen ausgerichtet.
- Betrieb: Bessere manuelle Wartbarkeit von Benutzer- und Rechtdaten direkt in NocoDB.
- Risiko: Bestehende Logik muss mit neuen oder angepassten Feldbezeichnungen kompatibel bleiben.