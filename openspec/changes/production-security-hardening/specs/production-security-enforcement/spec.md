## ADDED Requirements

### Requirement: @Public()-Decorator für Auth-Skip
Die Middleware SHALL einen `@Public()`-Decorator bereitstellen, der Endpoints von der JWT-Authentifizierung ausnimmt.

#### Scenario: Public-Endpoint ohne Token
- **GIVEN** ein Endpoint ist mit `@Public()` dekoriert
- **WHEN** ein Request ohne `Authorization`-Header eingeht
- **THEN** wird der Endpoint trotzdem ausgeführt (kein 401)

#### Scenario: Protected-Endpoint ohne Token
- **GIVEN** ein Endpoint hat keinen `@Public()`-Decorator
- **WHEN** ein Request ohne `Authorization`-Header eingeht
- **THEN** wird der Request mit 401 Unauthorized abgelehnt

### Requirement: Sicheres Bootstrap-Seeding
Die Middleware SHALL beim ersten Start einen Admin-User mit einem konfigurierbaren Passwort (`BOOTSTRAP_ADMIN_PASSWORD`) erstellen, aber nicht bei jedem Neustart erneut.

#### Scenario: Sicheres Default-Passwort
- **GIVEN** `BOOTSTRAP_ADMIN_PASSWORD` ist nicht gesetzt
- **WHEN** der Bootstrap durchläuft
- **THEN** wird ein generiertes Passwort verwendet und ins Log geschrieben

#### Scenario: Idempotenz
- **GIVEN** ein Admin-User existiert bereits
- **WHEN** der Service neu startet
- **THEN** wird kein neuer User erstellt und keine bestehenden Daten überschrieben

### Requirement: Swagger-Umgebungsschutz
Die Middleware SHALL Swagger UI in Production-Umgebungen deaktivieren, es sei denn, `SWAGGER_ENABLED=true` ist explizit gesetzt.

#### Scenario: Swagger in Production deaktiviert
- **GIVEN** `NODE_ENV=production` und `SWAGGER_ENABLED` ist nicht gesetzt
- **WHEN** die App startet
- **THEN** wird Swagger UI nicht registriert und `/api/docs` ist nicht erreichbar

### Requirement: Konfigurierbares NocoDB-Rate-Limiting
Die Middleware SHALL das Rate-Limit für NocoDB-API-Calls per `NOCODB_RATE_LIMIT_MS` ENV-Variable konfigurierbar machen (Default: 200ms).

#### Scenario: Rate-Limit-Konfiguration
- **GIVEN** `NOCODB_RATE_LIMIT_MS=500` ist gesetzt
- **WHEN** der NocoDBService initialisiert wird
- **THEN** beträgt der Abstand zwischen Data-API-Calls 500ms

### Requirement: CORS-Konfigurations-Prüfung
Die Middleware SHALL beim Start prüfen, ob `CORS_ORIGINS` gesetzt ist, und eine Warnung ausgeben, wenn nicht.

#### Scenario: Fehlende CORS-Konfiguration
- **GIVEN** `CORS_ORIGINS` ist nicht gesetzt
- **WHEN** die App startet
- **THEN** wird eine Warnung geloggt: "CORS_ORIGINS is not configured – all origins may be blocked"
