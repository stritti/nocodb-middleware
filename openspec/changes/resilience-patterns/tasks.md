## 1. Retry-Logik

- [x] 1.1 Axios-Response-Interceptor für Retry mit exponentiellem Back-off implementieren _(umgesetzt mit `axios-retry` in `NocoDBService`)_
- [ ] 1.2 Retry nur bei idempotenten Operationen (Read/List/Exists/FindOne) und transienten Fehlern (5xx, ECONNREFUSED, ECONNRESET, ETIMEDOUT) _(Abweichung: auch PUT/DELETE werden bei 5xx wiederholt; behoben in #286)_
- [ ] 1.3 Kein Retry für nicht-idempotente Operationen (Create/Update/Delete) _(POST/PATCH werden bei Netzwerkfehlern wiederholt; behoben in #286)_
- [ ] 1.4 Max 3 Retries, Basis 200ms, Faktor 2, max 5s _(Abweichung: aktuell Basis 1 s, max. 10 s (konfigurierbar über `NOCODB_RETRY_*`))_
- [ ] 1.5 Kein Retry für 4xx-Fehler (Client-Fehler) _(429 wird bewusst für alle Methoden wiederholt, da NocoDB den Request nicht verarbeitet hat)_

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
