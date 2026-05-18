## Context

NocoDB ist ein externes System, das durch Netzwerkprobleme, Lastspitzen oder Wartungsfenster temporär nicht erreichbar sein kann. Aktuell führt jeder Fehler sofort zum Abbruch der Operation.

Axios als HTTP-Client bietet bereits Interceptor-Support für Retry-Logik. Für den Circuit-Breaker wird `opossum` als leichtgewichtige, erprobte Bibliothek empfohlen.

## Goals / Non-Goals

**Goals:**
- Automatische Wiederholung bei transienten Fehlern (5xx, Timeouts, Netzwerkfehler)
- Circuit-Breaker öffnet nach N Fehlern in M Sekunden
- Health-Check zeigt Circuit-Breaker-Status
- Alle Parameter via ENV konfigurierbar

**Non-Goals:**
- Kein Fallback auf alternative Datenquellen
- Keine Queue-Persistenz für spätere Verarbeitung
- Kein Saga-Pattern für verteilte Transaktionen

## Decisions

- **Retry via axios-Interceptor**: Eigener Axios-Interceptor statt `axios-retry`-Bibliothek, um Abhängigkeiten zu minimieren
- **Exponentielles Back-off**: Basis 200ms, Faktor 2, max 5 Sekunden, max 3 Versuche
- **Circuit-Breaker via `opossum`**: Bewährtes Node.js-Pattern, aktiv gewartet
- **Schwellen**: 5 Fehler in 30 Sekunden → Circuit öffnet für 60 Sekunden
- **Nur NocoDB-API-Calls betreffend**: Kein Circuit-Breaker für interne Service-Calls

## Risks / Trade-offs

- [Risk] Retry kann bei idempotenten Operationen (Reads) problemlos wiederholt werden, bei Create/Update muss Idempotenz sichergestellt werden → Retry nur bei GET + Fehlerklassen die idempotent sind (5xx, Timeout)
- [Risk] Circuit-Breaker könnte zu früh auslösen → Schwellen sind anpassbar
- [Risk] `opossum` erhöht Memory-Footprint → minimaler Overhead (<100KB)
