# Logging

## Überblick

Die Applikation nutzt strukturiertes Logging auf Basis von **Pino** (`nestjs-pino` / `pino-http`).
In Produktion wird jede Log-Ausgabe als eine JSON-Zeile (NDJSON) auf `stdout` geschrieben,
in der Entwicklung menschenlesbar über `pino-pretty` aufbereitet.

Ziele des Konzepts:

- Maschinenlesbare, aggregierbare Logs (ein JSON-Objekt pro Zeile)
- Korrelation von Logs über Requests hinweg (Request-ID, Trace-ID)
- Keine Secrets oder personenbezogenen Daten in Logs (Redaction)
- Klare Level-Richtlinie, damit Logs im Betrieb sinnvoll gefiltert werden können
- 12-Factor-konformer Standard: `stdout` in Containern, optionales Datei-Logging über `LOG_DIR`

## Komponenten

### `LoggerModule` (Pino-Konfiguration)

- Datei: `src/app.module.ts`
- Registriert `nestjs-pino` global mit `pinoHttp`.
- Level über `LOG_LEVEL`, Default: `debug` in Entwicklung, `info` in Produktion.
- Entwicklung: `pino-pretty` (colorized, single line). Produktion: reines JSON.
- `redact`: `req.headers.authorization`, `req.headers.cookie` werden entfernt.
- `autoLogging.ignore`: `/health` (siehe "Bekannte Lücken" zum falschen Pfad).

### HTTP-Request-Logging (`pino-http`)

- Datei: Konfiguration in `src/app.module.ts`
- Jeder HTTP-Request erzeugt automatisch zwei Log-Einträge: `req` (eingehend) und `res` (ausgehend) mit Status, Dauer und Request-ID.
- In `src/main.ts` wird der Pino-Logger über `app.useLogger(app.get(Logger))` als applikationsweiter Logger gesetzt.

### `LoggingMiddleware`

- Datei: `src/nocodb/middleware/logging.middleware.ts`
- Loggt manuell `method url status - userAgent +Xms` über den NestJS-Logger.
- **Duplikat** zum `pino-http`-Auto-Logging (siehe "Bekannte Lücken").

### Event-Logging

- Datei: `src/permissions/permission-audit.ts`
- Sicherheitsrelevante Ereignisse werden mit einem `event`-Marker und strukturierten Feldern geloggt, z. B. `{ event: 'permission_denied', userId, action, table }`.
- Mit `nestjs-pino` landen Objekt-Argumente als top-level JSON-Felder.

### Tracing

- Datei: `src/tracing/telemetry.service.ts`, `src/tracing/tracing.ts`
- Optionale OpenTelemetry-Integration (`OTEL_ENABLED`). Wenn aktiv, enthält jeder Log-Eintrag `trace_id` / `span_id`.

## Log-Format

Jede Zeile ist ein JSON-Objekt mit mindestens:

| Feld        | Inhalt                                             |
| ----------- | -------------------------------------------------- |
| `level`     | `10` (trace) … `50` (error), plus Name in Pretty   |
| `time`      | Unix-Timestamp (ms)                                |
| `pid`, `hostname` | Prozess- und Host-Identifikation            |
| `msg`       | Meldungstext                                       |
| `req` / `res` | Bei HTTP-Logs: Request/Response-Objekt (redacted) |
| `reqId`     | Korrelations-ID des Requests                        |
| `trace_id`  | Nur bei aktiviertem OpenTelemetry                  |
| `event`     | Bei Event-Logs: stabiler Event-Name (z. B. `permission_denied`) |

Beispiel (Produktion):

```json
{"level":30,"time":1763200000000,"pid":1,"hostname":"web-1","reqId":"9f2c…","msg":"incoming request","req":{"method":"GET","url":"/api/meta/tables","headers":{}}}
```

## Log-Level-Richtlinie

| Level     | Wann                                                     | Beispiele                                        |
| --------- | -------------------------------------------------------- | ------------------------------------------------ |
| `error`   | Operation fehlgeschlagen, Exception, Datenverlust-Risiko | Upstream 5xx, unbehandelte Exceptions            |
| `warn`    | Sicherheitsrelevante oder unerwartete, aber beherrschte Ereignisse | `permission_denied`, 401/403, Retry eines Upstream-Calls |
| `info`    | Wichtige Geschäfts- und Betriebsereignisse               | HTTP-Request/Response (auto), Audit-Events, Start/Shutdown |
| `debug`   | Entwickler-Diagnose, nur in Dev default                   | Cache-Treffer, interne Zustandsübergänge         |
| `trace`   | Sehr detailliert, nur punktuell aktivieren               | Payload-Details (nie mit Secrets/PII)            |

Konfiguration: `LOG_LEVEL` (siehe `.env.example`). Default: `debug` in Entwicklung, `info` in Produktion.

## HTTP-Request-Logging

- Über `pino-http` `autoLogging` wird jeder Request genau einmal als `req` und einmal als `res` geloggt (inkl. `statusCode` und `responseTime`).
- Health- und Doku-Endpunkte sollen nicht geloggt werden (`autoLogging.ignore`), um Noise zu vermeiden.
- Der `LoggingMiddleware` soll mittelfristig entfallen, damit Request-Logging nicht doppelt erfolgt.

## Korrelation

- Jeder HTTP-Request erhält eine **Request-ID** (`reqId` in allen Logs des Requests, Response-Header `X-Request-Id`).
- Eine eingehende `X-Request-Id` wird übernommen, sonst wird eine UUID erzeugt.
- Bei aktiviertem OpenTelemetry wird zusätzlich `trace_id` / `span_id` in die Logs injiziert.
- Die Request-ID soll an Upstream-Calls (NocoDB API) als Header weitergegeben werden, damit Logs über Systemgrenzen korreliert werden können.

## Sicherheit und Redaction

- Immer redacted: `req.headers.authorization`, `req.headers.cookie`, `res` `set-cookie`, API-Tokens in Headern.
- Secrets (`JWT_SECRET`, `NOCODB_API_TOKEN`, `BOOTSTRAP_ADMIN_TOKEN`, Passwörter) dürfen **niemals** geloggt werden – weder als komplettes Objekt noch als Feld.
- Personenbezogene Daten und Freitext-Felder nur auf `debug`/`trace` und nur, wenn fachlich nötig; XSS-Sanitization (`SanitizeMiddleware`) läuft vor dem Logging von Bodies.
- Query-Parameter können Tokens enthalten → nur bei Bedarf und redacted loggen.

## Datei-Logging und Rotation

- `LOG_DIR` (Default `logs`, siehe `.env.example`) ist für optionales Datei-Logging vorgesehen.
- Standard in Containern/Produktion: **nur `stdout`**, Aggregation über den Container-Logger (Docker `json-file` mit `max-size`, oder Collector wie Loki/Fluent Bit).
- Optional: JSON-Logs zusätzlich nach `<LOG_DIR>/app.log` schreiben (nur wenn explizit aktiviert, z. B. `LOG_FILE_ENABLED=true`), mit Rotation (max. Dateigröße und Anzahl Dateien).
- Fehler beim Datei-Schreiben dürfen einen Request nie fehlschlagen lassen (async, geloggt auf `stderr`).

## Umgebungen

| Umgebung    | Transport                          | Level-Default | Datei-Logging      |
| ----------- | ---------------------------------- | ------------- | ------------------ |
| Development | `pino-pretty` (colorized, stdout) | `debug`       | aus                |
| Production  | JSON nach `stdout`                 | `info`        | optional via `LOG_DIR` |

## Betrieb

- Logs werden zentral gesammelt (stdout → Collector) und dort indiziert.
- Retention: abhängig von Umgebung und Compliance (Vorschlag: 7 Tage hot, 30 Tage cold).
- Alerting auf: `level >= error`, Spike von 5xx, Spike von 401/403, Upstream-Fehlern (siehe `docs/deployment.md`).
- Dashboards: Request-Rate, Fehlerrate, Latenz (aus `res.responseTime`), Cache-Hit-Rate.

## Bekannte Lücken

- `LoggingMiddleware` und `pino-http` loggen Requests doppelt.
- `autoLogging.ignore` prüft auf `/health`, die Route ist aber `/api/health` (Global Prefix) → Health-Checks werden aktuell mitgeloggt.
- `LOG_DIR` ist dokumentiert, aber nirgends im Code verdrahtet (kein Datei-Logging, keine Rotation).
- Keine explizite Request-ID-Vergabe und keine Weitergabe an NocoDB-Upstream-Calls.

## Geplante Schärfung (OpenSpec)

Die Beseitigung dieser Lücken ist als OpenSpec-Change formuliert:
[`openspec/changes/structured-logging-concept/proposal.md`](https://github.com/stritti/nocodb-middleware/blob/main/openspec/changes/structured-logging-concept/proposal.md)

- Konsolidierung auf einen einzigen Request-Log-Pfad (Pino `autoLogging`)
- Request-ID (`X-Request-Id`) mit Weitergabe an Upstream-Calls
- Erweiterte Redaction und dokumentierte Level-Richtlinie
- Optionales Datei-Logging nach `LOG_DIR` mit Rotation
