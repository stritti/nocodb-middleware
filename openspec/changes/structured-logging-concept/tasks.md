## 1. Request-Logging konsolidieren

- [ ] 1.1 `LoggingMiddleware` entfernen (`src/nocodb/middleware/logging.middleware.ts` + Registrierung in `src/nocodb/nocodb.module.ts`)
- [ ] 1.2 `autoLogging.ignore` in `src/app.module.ts` auf `/api/health` und Swagger-Routen korrigieren
- [ ] 1.3 Spec: ein Request erzeugt genau ein `req`- und ein `res`-Log, Health-Checks erzeugen keines

## 2. Request-ID und Korrelation

- [ ] 2.1 `genReqId` (UUID v4) in `pino-http` konfigurieren; eingehende `X-Request-Id` nur übernehmen, wenn sie UUID-Format hat
- [ ] 2.2 `X-Request-Id` als Response-Header setzen (Middleware in `main.ts`/`app.setup.ts`)
- [ ] 2.3 `NocoDBService` sendet `X-Request-Id` aus dem aktuellen Request an NocoDB-Upstream-Calls
- [ ] 2.4 Bei aktivem OTEL: `trace_id`/`span_id` im Log sicherstellen (bereits via `nestjs-pino` + Tracing-Bridge prüfen)
- [ ] 2.5 Specs: reqId in allen Request-Logs, Header in Response, Weitergabe an Upstream

## 3. Konfiguration und Level

- [ ] 3.1 `LOG_LEVEL` gegen gültige Pino-Levels validieren; ungültig → `info` + `warn`-Log
- [ ] 3.2 Defaults dokumentieren: `debug` in dev, `info` in prod (bereits umgesetzt, verifizieren)
- [ ] 3.3 `.env.example` um `LOG_FILE_ENABLED` und Rotations-Variablen ergänzen

## 4. Redaction und Sicherheit

- [ ] 4.1 `redact` in `src/app.module.ts` erweitern: `req.headers.authorization`, `req.headers.cookie`, `req.headers['x-api-token']`, `res.headers['set-cookie']`
- [ ] 4.2 Sicherstellen, dass Secrets (`NOCODB_API_TOKEN`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_TOKEN`) nirgends geloggt werden (Code-Review + Test)
- [ ] 4.3 Spec: Authorization-Header erscheint nicht im Log

## 5. Optionales Datei-Logging mit Rotation

- [ ] 5.1 `LOG_FILE_ENABLED=true` + `LOG_DIR` → zusätzlicher `pino/file`-Transport nach `<LOG_DIR>/app.log` (JSON)
- [ ] 5.2 `pino-roll` als Dependency; Rotation konfigurierbar (Default: 10 MB, 5 Dateien)
- [ ] 5.3 Schreibfehler des File-Transports dürfen Requests nicht fehlschlagen lassen (async, Fehler auf `stderr`)
- [ ] 5.4 Spec: Datei wird geschrieben, Rotation greift, Fehler brechen Request nicht ab

## 6. Event-Taxonomie

- [ ] 6.1 Event-Namen als Konstanten/Enum zentral definieren (`permission_denied`, `auth_failed`, `upstream_error`, `audit_*`)
- [ ] 6.2 `logPermissionDenied` (`src/permissions/permission-audit.ts`) auf DI-basierten Pino-Logger umstellen
- [ ] 6.3 `auth_failed` im Auth-Flow (JwtAuthGuard/Strategy) und `upstream_error` im `NocoDBService` ergänzen

## 7. Dokumentation und Tests

- [ ] 7.1 `docs/logging.md` schreiben (Konzept) und in `docs/index.md` verlinken
- [ ] 7.2 Unit-Tests: Level-Validierung, Redaction, Request-ID-Vergabe/Validierung
- [ ] 7.3 E2E-Test: genau ein Request-Log-Paar pro Request, `X-Request-Id` in Response
- [ ] 7.4 `npm run lint` und `npm test` grün
