## Context

Das Projekt hat bereits strukturiertes Logging via Pino (JSON-Format) und optionales OpenTelemetry-Tracing. Beide sind aber nicht auf die spezifischen Anforderungen von Audit-Trails und operativen Metriken ausgelegt.

### Audit-Logging
- Wird via Pino-Logger auf Ebene `info` ausgegeben
- Enthält: `{ audit: true, userId, action, table, recordId, timestamp, previousData?, newData? }`
- Implementierung als Wrapper im `NocoDBService` (create/update/delete)

### Prometheus-Metrics
- `prom-client` als Basis (kein Full-Prometheus-Modul nötig)
- Standard-Metriken: `http_requests_total`, `http_request_duration_seconds`, `http_errors_total`
- Applikations-Metriken: `cache_hits_total`, `cache_misses_total`, `nocodb_requests_total`
- Registrierung via `@PrometheusController` oder eigener `MetricsController`

## Goals / Non-Goals

**Goals:**
- Audit-Logs für alle Create/Update/Delete-Operationen mit User-ID
- `/metrics`-Endpoint mit Prometheus-kompatiblen Metriken
- Metriken für: Request-Count, Request-Dauer (Histogram), Fehlerrate, Cache-Treffer

**Non-Goals:**
- Keine Integration in ein bestehendes Monitoring-System (nur Endpoint-Bereitstellung)
- Kein strukturiertes Audit-Datenbank-Schema (Logs statt Datenbank)
- Kein Alerting oder Dashboard-Konfiguration

## Decisions

- **Audit via Logger**: Pino-Logs mit `audit: true`-Marker – einfacher als Audit-Event-System
- **prom-client direkt**: Kein `@willsoto/nestjs-prometheus`, um Abhängigkeiten zu minimieren
- **Metrics-Controller**: Eigener `MetricsController` unter `/metrics` mit `@Public()` (optional durch Auth geschützt)
- **Histogram für Dauer**: `http_request_duration_seconds` mit Buckets [0.01, 0.05, 0.1, 0.5, 1, 5]

## Risks / Trade-offs

- [Risk] Audit-Logs erhöhen Log-Volumen (Faktor 2-3x bei Schreib-lastigen Workloads) → Log-Rotation absichern
- [Risk] Prometheus-Metriken sind nur in Memory → bei Restart zurückgesetzt → langfristig Persistence via Pushgateway
- [Risk] `/metrics`-Endpoint könnte sensible Daten exponieren → standardmäßig durch JwtAuthGuard geschützt
