## ADDED Requirements

### Requirement: Einheitliches strukturiertes Logging via Pino
Die Applikation SHALL für alle Log-Ausgaben ausschließlich den globalen Pino-Logger (`nestjs-pino`) verwenden. Produktivcode SHALL keine eigenen `new Logger()`-Instanzen aus `@nestjs/common` für Request- oder Betriebs-Logs nutzen. Strukturierte Zusatzfelder SHALL als Objekt übergeben werden und als top-level JSON-Felder erscheinen.

#### Scenario: Service loggt strukturiertes Objekt
- **GIVEN** ein Service nutzt den injizierten Pino-Logger
- **WHEN** er `logger.info({ event: 'upstream_error', table: 'books' }, 'NocoDB call failed')` aufruft
- **THEN** erscheint in Produktion eine JSON-Zeile mit `level`, `time`, `msg`, `event: 'upstream_error'` und `table: 'books'` als top-level Felder

#### Scenario: Kein doppeltes Request-Logging
- **GIVEN** die Applikation ist gestartet
- **WHEN** ein einzelner HTTP-Request verarbeitet wird
- **THEN** wird genau ein `req`-Log und ein `res`-Log (pino-http autoLogging) ausgegeben und kein zusätzlicher Request-Log durch eine Middleware

### Requirement: HTTP-Request-Logging ohne Health/Doku-Noise
pino-http `autoLogging` SHALL für alle Routen außer `/api/health` und den Swagger-Routen aktiv sein. Die Ignore-Regel SHALL gegen den tatsächlichen Request-Pfad inkl. Global Prefix (`/api`) prüfen.

#### Scenario: Health-Check wird nicht geloggt
- **GIVEN** ein Request auf `GET /api/health`
- **WHEN** der Request verarbeitet wird
- **THEN** wird kein `req`/`res`-Log für diesen Request ausgegeben

#### Scenario: API-Request wird geloggt
- **GIVEN** ein Request auf `GET /api/meta/tables`
- **WHEN** der Request verarbeitet wird
- **THEN** wird ein `req`-Log beim Eingang und ein `res`-Log mit `statusCode` und `responseTime` beim Abschluss ausgegeben

### Requirement: Request-ID-Korrelation
Jeder HTTP-Request SHALL eine Request-ID erhalten. Eine eingehende `X-Request-Id` SHALL übernommen werden, wenn sie dem UUID-Format entspricht, andernfalls SHALL eine neue UUID v4 generiert werden. Die Request-ID SHALL in allen Log-Einträgen des Requests als `reqId` erscheinen, als `X-Request-Id`-Response-Header gesetzt werden und an NocoDB-Upstream-Calls als `X-Request-Id`-Header weitergegeben werden. Bei aktiviertem OpenTelemetry SHALL zusätzlich `trace_id` im Log vorhanden sein.

#### Scenario: Neue Request-ID wird vergeben
- **GIVEN** ein Request ohne `X-Request-Id`-Header
- **WHEN** der Request verarbeitet wird
- **THEN** ist `reqId` eine UUID v4 in den Logs und `X-Request-Id` im Response-Header

#### Scenario: Eingehende Request-ID wird übernommen
- **GIVEN** ein Request mit gültiger UUID in `X-Request-Id`
- **WHEN** der Request verarbeitet wird
- **THEN** wird diese ID in Logs und Response-Header verwendet

#### Scenario: Ungültige eingehende Request-ID wird ersetzt
- **GIVEN** ein Request mit `X-Request-Id: ../../etc/passwd`
- **WHEN** der Request verarbeitet wird
- **THEN** wird eine neue UUID v4 generiert und verwendet

#### Scenario: Request-ID wird an NocoDB weitergegeben
- **GIVEN** ein Request mit `reqId` im Kontext
- **WHEN** `NocoDBService` einen Upstream-Call an die NocoDB API ausführt
- **THEN** enthält der Upstream-Request den Header `X-Request-Id` mit derselben ID

### Requirement: Log-Level-Konfiguration
Das Log-Level SHALL über `LOG_LEVEL` konfigurierbar sein mit den gültigen Werten `trace`, `debug`, `info`, `warn`, `error`, `fatal`. Das Default SHALL `debug` in Entwicklung und `info` in Produktion sein. Ein ungültiger Wert SHALL zu `info` zurückfallen und beim Start eine Warnung loggen.

#### Scenario: Ungültiger LOG_LEVEL
- **GIVEN** `LOG_LEVEL=verbose`
- **WHEN** die Applikation startet
- **THEN** ist das effektive Level `info` und eine Warnung mit dem ungültigen Wert wird geloggt

#### Scenario: Default in Produktion
- **GIVEN** `NODE_ENV=production` und kein `LOG_LEVEL` gesetzt
- **WHEN** die Applikation startet
- **THEN** ist das effektive Level `info`

### Requirement: Redaction von Credentials
Die folgenden Felder SHALL in HTTP-Logs redacted werden: `req.headers.authorization`, `req.headers.cookie`, `req.headers['x-api-token']`, `res.headers['set-cookie']`. Secrets (`NOCODB_API_TOKEN`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_TOKEN`, Passwörter) SHALL in keinem Log-Eintrag erscheinen.

#### Scenario: Authorization-Header ist redacted
- **GIVEN** ein Request mit `Authorization: Bearer <token>`
- **WHEN** der `req`-Log ausgegeben wird
- **THEN** enthält das `req.headers`-Objekt keinen Wert für `authorization` (redacted)

#### Scenario: Secret wird nicht geloggt
- **GIVEN** der Wert von `NOCODB_API_TOKEN`
- **WHEN** beliebige Log-Ausgaben der Applikation geprüft werden
- **THEN** erscheint der Token-Wert in keinem Log-Eintrag

### Requirement: Event-Taxonomie für sicherheitsrelevante Ereignisse
Sicherheits- und betriebsrelevante Ereignisse SHALL mit einem stabilen `event`-Feld geloggt werden. Definierte Events: `permission_denied`, `auth_failed`, `upstream_error`, `audit_create`, `audit_update`, `audit_delete`. Jedes Event SHALL mindestens `event` und `time` enthalten; `permission_denied` zusätzlich `userId`, `action`, `table`.

#### Scenario: Permission denied wird als Event geloggt
- **GIVEN** ein authentifizierter User ohne Recht für eine Aktion
- **WHEN** der PermissionsGuard die Aktion verweigert
- **THEN** wird ein `warn`-Log mit `{ event: 'permission_denied', userId, action, table }` ausgegeben

#### Scenario: Upstream-Fehler wird als Event geloggt
- **GIVEN** ein NocoDB-Upstream-Call schlägt mit 5xx fehl
- **WHEN** der Fehler im `NocoDBService` behandelt wird
- **THEN** wird ein `error`-Log mit `{ event: 'upstream_error', status, table }` ausgegeben

### Requirement: Optionales Datei-Logging mit Rotation
Wenn `LOG_FILE_ENABLED=true` gesetzt ist, SHALL zusätzlich zu `stdout` eine JSON-Logdatei nach `<LOG_DIR>/app.log` geschrieben werden. Die Datei SHALL über `pino-roll` rotiert werden (Default: max. 10 MB pro Datei, 5 Dateien, konfigurierbar über Env). Fehler beim Datei-Schreiben SHALL asynchron behandelt werden und den HTTP-Request nicht beeinträchtigen.

#### Scenario: Datei-Logging aktiv
- **GIVEN** `LOG_FILE_ENABLED=true` und `LOG_DIR=logs`
- **WHEN** ein Log-Eintrag ausgegeben wird
- **THEN** erscheint derselbe Eintrag als JSON-Zeile in `logs/app.log` und auf `stdout`

#### Scenario: Datei-Logging deaktiviert (Default)
- **GIVEN** `LOG_FILE_ENABLED` nicht gesetzt
- **WHEN** die Applikation läuft
- **THEN** wird nur nach `stdout` geloggt und keine Logdatei geschrieben

#### Scenario: Rotation greift
- **GIVEN** Datei-Logging aktiv und `app.log` hat die maximale Größe erreicht
- **WHEN** weitere Einträge geschrieben werden
- **THEN** wird eine neue Datei begonnen und die älteste Datei nach Erreichen der maximalen Dateianzahl gelöscht

#### Scenario: Schreibfehler beeinträchtigt Request nicht
- **GIVEN** Datei-Logging aktiv und das Log-Verzeichnis ist nicht beschreibbar
- **WHEN** ein HTTP-Request verarbeitet wird
- **THEN** wird der Request normal beantwortet und der Schreibfehler asynchron auf `stderr` gemeldet
