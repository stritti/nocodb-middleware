## ADDED Requirements

### Requirement: Request-Context-Propagation via AsyncLocalStorage
Die Middleware SHALL einen Request-Context über `AsyncLocalStorage` bereitstellen, der nach erfolgreicher Authentifizierung die User-ID für die gesamte Request-Lebensdauer verfügbar macht. Der Context SHALL in einem Middleware-Glied nach dem JwtAuthGuard (oder in einem Interceptor) befüllt werden, sodass nachgelagerte Services wie `NocoDBService` auf die User-ID zugreifen können, ohne sie explizit als Parameter zu übergeben.

#### Scenario: Context nach erfolgreichem Login
- **GIVEN** ein Request durchläuft erfolgreich die JwtAuthGuard-Authentifizierung
- **WHEN** der Request verarbeitet wird
- **THEN** ist `userId` aus `req.user` im `AsyncLocalStorage`-Context verfügbar

#### Scenario: Context ohne Auth
- **GIVEN** ein Request erreicht einen `@Public()`-Endpoint
- **WHEN** der Request verarbeitet wird
- **THEN** enthält der `AsyncLocalStorage`-Context keine User-ID (undefined)

### Requirement: Audit-Logging für Schreiboperationen
Der NocoDBService SHALL bei jeder Create-, Update- und Delete-Operation einen Audit-Log-Eintrag mit User-ID (aus dem AsyncLocalStorage-Request-Context), Aktion, Tabellenname, Record-ID und Timestamp ausgeben.

#### Scenario: Create wird geloggt
- **GIVEN** ein authentifizierter User (userId=42) erstellt einen Record
- **AND** der Request-Context (AsyncLocalStorage) enthält `userId: 42`
- **WHEN** `NocoDBService.create()` aufgerufen wird
- **THEN** wird ein Log-Eintrag mit `{ audit: true, userId: 42, action: 'create', table: 'users', recordId: 123, timestamp: '...' }` ausgegeben

#### Scenario: Update wird geloggt
- **GIVEN** der Request-Context enthält eine User-ID
- **WHEN** `NocoDBService.update()` aufgerufen wird
- **THEN** enthält der Log-Eintrag `action: 'update'` und die geänderte Record-ID

#### Scenario: Delete wird geloggt
- **GIVEN** der Request-Context enthält eine User-ID
- **WHEN** `NocoDBService.delete()` aufgerufen wird
- **THEN** enthält der Log-Eintrag `action: 'delete'` und die gelöschte Record-ID
