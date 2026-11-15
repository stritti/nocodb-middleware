## Why

Logging ist teilweise vorhanden (Pino via `nestjs-pino`, JSON in Produktion), aber inkonsistent und lückenhaft:

1. **Doppeltes Request-Logging**: `pino-http` (`autoLogging`) und `LoggingMiddleware` (`src/nocodb/middleware/logging.middleware.ts`) loggen jeden Request zweimal – mit unterschiedlichen Formaten.
2. **`LOG_DIR` ist dokumentiert, aber nicht verdrahtet**: `.env.example` und `docs/deployment.md` versprechen Datei-Logging, im Code existiert keines. Rotation fehlt komplett.
3. **Keine Korrelation über Systemgrenzen**: Es gibt keine Request-ID, die in Logs und an NocoDB-Upstream-Calls weitergereicht wird; bei OTEL ist `trace_id` vorhanden, aber ohne Request-ID ist die Korrelation lückenhaft.
4. **Health-Check-Noise**: `autoLogging.ignore` prüft auf `/health`, die Route ist aber `/api/health` (Global Prefix) – Health-Checks werden mitgeloggt.
5. **Keine dokumentierte Level-/Event-Richtlinie**: Level-Verwendung und `event`-Marker (z. B. `permission_denied` in `src/permissions/permission-audit.ts`) sind nicht als Standard festgelegt.

## What Changes

- Konsolidierung auf einen einzigen Request-Log-Pfad: `pino-http` `autoLogging`; `LoggingMiddleware` entfällt
- Request-ID pro HTTP-Request (`reqId` in Logs, `X-Request-Id` Response-Header, Übernahme eingehender IDs, Weitergabe an NocoDB-Upstream als Header)
- `autoLogging.ignore` korrigiert auf die realen Pfade (`/api/health`, Doku-Routen)
- Erweiterte Redaction (Authorization, Cookie, Set-Cookie, API-Token-Header) als expliziter Standard
- Dokumentierte Log-Level-Richtlinie und `LOG_LEVEL`-Validierung (Default `debug` dev / `info` prod, ungültig → `info` + Warnung)
- Event-Konvention: sicherheitsrelevante Ereignisse mit stabilem `event`-Feld (`permission_denied`, `auth_failed`, `upstream_error`, `audit_*`)
- Optionales Datei-Logging nach `LOG_DIR` (aktiviert via `LOG_FILE_ENABLED=true`) mit Rotation; Schreibfehler dürfen Requests nicht fehlschlagen lassen
- Logging-Konzept als Doku: `docs/logging.md`

## Capabilities

### New Capabilities
- `structured-logging`: Einheitliches strukturiertes Logging mit Request-Korrelation, Level-Richtlinie, Redaction, Event-Taxonomie und optionalem Datei-Logging mit Rotation.

### Modified Capabilities
- `AppModule` (`src/app.module.ts`) – Pino-Konfiguration: ignore-Pfade, Redaction, optionaler File-Transport
- `NocoDBModule` / `LoggingMiddleware` – Entfernung der Doppel-Log-Zeile
- `NocoDBService` – Weitergabe der Request-ID an Upstream-Calls
- `main.ts` – Request-ID-Middleware registrieren

## Impact

- Neue optionale Dependency: `pino-roll` (nur für Datei-Rotation; nur aktiv wenn `LOG_FILE_ENABLED=true`)
- Neue Env-Variablen: `LOG_FILE_ENABLED` (Default `false`); `LOG_DIR` und `LOG_LEVEL` existieren bereits
- Bestehende Log-Konsumenten müssen mit dem Wegfall der `LoggingMiddleware`-Zeile rechnen (Formatänderung)
- Kein Breaking Change für die API; `X-Request-Id` ist ein zusätzlicher Response-Header
- Konzeptdokument: `docs/logging.md` (verlinkt in `docs/index.md`)
