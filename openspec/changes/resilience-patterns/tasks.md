## 1. Retry-Logik

- [ ] 1.1 Axios-Response-Interceptor für Retry mit exponentiellem Back-off implementieren
- [ ] 1.2 Retry nur bei idempotenten Operationen (Read/List/Exists/FindOne) und transienten Fehlern (5xx, ECONNREFUSED, ECONNRESET, ETIMEDOUT)
- [ ] 1.3 Kein Retry für nicht-idempotente Operationen (Create/Update/Delete)
- [ ] 1.4 Max 3 Retries, Basis 200ms, Faktor 2, max 5s
- [ ] 1.5 Kein Retry für 4xx-Fehler (Client-Fehler)

## 2. Circuit-Breaker

- [ ] 2.1 `opossum` als Dependency installieren
- [ ] 2.2 `NocoDBService` mit Circuit-Breaker umschließen
- [ ] 2.3 Schwellen: 5 Fehler / 30s → open für 60s
- [ ] 2.4 ENV-Config: `NOCODB_CB_THRESHOLD`, `NOCODB_CB_RESET_MS`

## 3. Integration & Tests

- [ ] 3.1 Health-Check um Circuit-Breaker-Status erweitern
- [ ] 3.2 Unit-Tests: Retry bei transienten Fehlern
- [ ] 3.3 Unit-Tests: Circuit-Breaker öffnet/schließt korrekt
- [ ] 3.4 `.env.example` um neue Parameter ergänzen
