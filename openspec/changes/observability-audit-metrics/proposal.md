## Why

Production-Betrieb erfordert zwei Observability-Features, die aktuell fehlen:

1. **Audit-Logging**: Schreiboperationen (Create/Update/Delete) werden nicht mit User-ID protokolliert. Bei Sicherheitsvorfällen oder Datenverlust ist nicht nachvollziehbar, wer welche Änderung vorgenommen hat.
2. **Prometheus-Metrics**: Es gibt keinen `/metrics`-Endpoint für operatives Monitoring. CPU, Memory, Request-Dauer, Fehlerraten und Cache-Treffer sind nicht messbar.

## What Changes

- Audit-Logging für alle Create/Update/Delete-Operationen im NocoDBService
- Jeder Audit-Eintrag enthält: User-ID, Aktion, Table, Record-ID, Timestamp
- `/metrics`-Endpoint mit Prometheus-kompatiblen Metriken
- Standard-Metriken: Request-Count, -Duration, -Errors, Cache-Hits/Misses

## Capabilities

### New Capabilities
- `audit-logging`: Protokolliert alle Schreiboperationen mit User-ID und Metadaten.
- `prometheus-metrics`: Stellt `/metrics`-Endpoint mit Prometheus-kompatiblen Metriken bereit.

### Modified Capabilities
- `NocoDBService` – Audit-Event-Emitting bei CUD-Operationen
- `AppModule` – Prometheus-Modul-Integration

## Impact

- Neue Abhängigkeit: `@willsoto/nestjs-prometheus` (oder `prom-client`)
- Audit-Daten werden als strukturierte Logs (Pino) ausgegeben → können von Log-Aggregatoren verarbeitet werden
- Metrics-Endpoint benötigt Auth (default protected, kann via `@Public()` geöffnet werden)
- Minimaler Performance-Overhead
