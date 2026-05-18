## 1. Audit-Logging

- [ ] 1.1 `NocoDBService.create/update/delete` um Audit-Log-Eintrag erweitern
- [ ] 1.2 Audit-Eintrag enthält: userId (aus Request-Context), action, table, recordId, timestamp
- [ ] 1.3 Logger-Level `info` mit `{ audit: true }`-Marker
- [ ] 1.4 Specs: Audit-Log wird bei CUD-Operationen ausgegeben

## 2. Prometheus-Metriken

- [ ] 2.1 `prom-client` als Dependency installieren
- [ ] 2.2 Standard HTTP-Metriken: Counter für Requests, Histogram für Duration, Counter für Errors
- [ ] 2.3 Applikations-Metriken: Cache-Hits/Misses, NocoDB-Request-Count
- [ ] 2.4 `MetricsController` mit `GET /metrics` Endpoint
- [ ] 2.5 Label: `method`, `route`, `status_code`

## 3. Tests

- [ ] 3.1 Spec: Audit-Log enthält korrekte User-ID
- [ ] 3.2 Spec: Metriken werden nach Request inkrementiert
- [ ] 3.3 Spec: `/metrics`-Endpoint liefert gültiges Prometheus-Format
