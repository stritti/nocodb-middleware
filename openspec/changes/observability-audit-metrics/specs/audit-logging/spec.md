## ADDED Requirements

### Requirement: Audit-Logging für Schreiboperationen
Der NocoDBService SHALL bei jeder Create-, Update- und Delete-Operation einen Audit-Log-Eintrag mit User-ID, Aktion, Tabellenname, Record-ID und Timestamp ausgeben.

#### Scenario: Create wird geloggt
- **GIVEN** ein authentifizierter User (userId=42) erstellt einen Record
- **WHEN** `NocoDBService.create()` aufgerufen wird
- **THEN** wird ein Log-Eintrag mit `{ audit: true, userId: 42, action: 'create', table: 'users', recordId: 123, timestamp: '...' }` ausgegeben

#### Scenario: Update wird geloggt
- **GIVEN** ein authentifizierter User aktualisiert einen Record
- **WHEN** `NocoDBService.update()` aufgerufen wird
- **THEN** enthält der Log-Eintrag `action: 'update'` und die geänderte Record-ID

#### Scenario: Delete wird geloggt
- **GIVEN** ein authentifizierter User löscht einen Record
- **WHEN** `NocoDBService.delete()` aufgerufen wird
- **THEN** enthält der Log-Eintrag `action: 'delete'` und die gelöschte Record-ID
