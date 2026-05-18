## 1. Request-Context-Propagation (AsyncLocalStorage)

- [ ] 1.1 `RequestContextService` mit `AsyncLocalStorage` erstellen (Methoden: `run()`, `set()`, `get()`)
- [ ] 1.2 `ContextInterceptor` erstellen, der nach JwtAuthGuard `req.user.userId` in den Context speichert
- [ ] 1.3 `ContextInterceptor` global registrieren (oder als Middleware nach Guards einhängen)
- [ ] 1.4 `NocoDBService` erhält `RequestContextService` per DI und liest `userId` daraus

## 2. Audit-Logging

- [ ] 2.1 `NocoDBService.create/update/delete` um Audit-Log-Eintrag erweitern
- [ ] 2.2 Audit-Eintrag enthält: userId (aus AsyncLocalStorage-Context), action, table, recordId, timestamp
- [ ] 2.3 Logger-Level `info` mit `{ audit: true }`-Marker
- [ ] 2.4 Specs: Audit-Log wird bei CUD-Operationen ausgegeben

## 3. Prometheus-Metriken

- [ ] 3.1 `prom-client` als Dependency installieren
- [ ] 3.2 Standard HTTP-Metriken: Counter für Requests, Histogram für Duration, Counter für Errors
- [ ] 3.3 Applikations-Metriken: Cache-Hits/Misses, NocoDB-Request-Count
- [ ] 3.4 `MetricsController` mit `GET /metrics` Endpoint
- [ ] 3.5 Label: `method`, `route`, `status_code`

## 4. Tests

- [ ] 4.1 Spec: Audit-Log enthält korrekte User-ID aus AsyncLocalStorage-Context
- [ ] 4.2 Spec: Metriken werden nach Request inkrementiert
- [ ] 4.3 Spec: `/metrics`-Endpoint liefert gültiges Prometheus-Format
