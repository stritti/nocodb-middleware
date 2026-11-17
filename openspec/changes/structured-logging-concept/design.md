## Context

Die Applikation nutzt bereits Pino (`nestjs-pino` + `pino-http`) als globalen Logger (`src/app.module.ts`, `src/main.ts`). Darüber hinaus loggt `LoggingMiddleware` (`src/nocodb/middleware/logging.middleware.ts`) jeden Request manuell – das ergibt doppelte, unterschiedlich formatierte Request-Logs. `LOG_DIR` ist in `.env.example` und `docs/deployment.md` dokumentiert, aber nirgends im Code verwendet. Sicherheits-Events werden punktuell mit `event`-Marker geloggt (`src/permissions/permission-audit.ts`). OpenTelemetry (`src/tracing/`) ist optional und liefert `trace_id`, wenn aktiv.

## Goals / Non-Goals

**Goals:**
- Genau ein Request-Log-Paar (`req`/`res`) pro HTTP-Request via `pino-http`
- Request-ID in jedem Log-Eintrag und als `X-Request-Id`-Header, inkl. Weitergabe an NocoDB
- Dokumentierte Level-Richtlinie, validiertes `LOG_LEVEL`
- Redaction aller credential-haltigen Header als Standard
- Optionales, rotierendes Datei-Logging nach `LOG_DIR`
- Konzeptdokument `docs/logging.md`

**Non-Goals:**
- Kein Wechsel zu Winston oder einem anderen Logger (Pino ist etabliert, JSON-nativ, performant)
- Kein zentrales Log-Aggregationssystem (Logs bleiben stdout-basiert; Collector ist Deployment-Thema)
- Keine PII-Anonymisierung über die Header-Redaction hinaus
- Kein Audit-Log in Datenbank (bleibt bei strukturierten Logs; siehe `observability-audit-metrics`)

## Decisions

- **Pino bleibt die einzige Logging-Bibliothek**: Umstieg auf Winston hätte keinen Mehrwert und würde bestehende Log-Pipelines brechen.
- **`pino-http` autoLogging als einzige Request-Log-Quelle**: `LoggingMiddleware` wird entfernt; sein Informationsgehalt (Status, Dauer) ist in den `res`-Logs von `pino-http` bereits enthalten.
- **Request-ID**: `genReqId` von `pino-http` (UUID v4), eingehende `X-Request-Id` wird respektiert; zusätzlich `X-Request-Id` als Response-Header. Weitergabe an NocoDB-Upstream-Calls als `X-Request-Id`-Header im `NocoDBService`.
- **Datei-Logging opt-in**: In Containern bleibt `stdout` der Standard (12-Factor); Datei-Logging nur bei `LOG_FILE_ENABLED=true` über `pino.transport` mit `pino/file`-Ziel nach `LOG_DIR`. Rotation über `pino-roll` (max 10 MB, 5 Dateien, Default konfigurierbar).
- **Level-Validierung**: `LOG_LEVEL` gegen Pino-Levels prüfen; ungültiger Wert → `info` + `warn`-Log beim Start.
- **Event-Taxonomie**: stabile `event`-Strings für maschinenlesbare Filter: `permission_denied` (bestehend), `auth_failed`, `upstream_error`, `audit_create` / `audit_update` / `audit_delete`.

## Risks / Trade-offs

- [Risk] Wegfall der `LoggingMiddleware`-Zeile ändert das Log-Format → bestehende Parser/Dashboards müssen angepasst werden → im PR kommunizieren
- [Risk] Datei-Logging kann bei vollem Datenträger blockieren → asynchroner Transport (`pino-roll`/`sonic-boom`), Schreibfehler nur auf `stderr`, nie in den Request-Pfad propagieren
- [Risk] `X-Request-Id` von Clients könnte Log-Injection ermöglichen → ID auf UUID-Format validieren, sonst neu generieren
- [Risk] Höheres Log-Volumen durch Request-Logs in Produktion → Health/Doku-Routen ignorieren, Level-Default `info`
- [Risk] Upstream-Header könnten sensible Werte an NocoDB senden → nur `X-Request-Id` weitergeben, keine Authorization-Daten duplizieren
