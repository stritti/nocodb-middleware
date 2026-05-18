## Why

Der NocoDBService hat aktuell keine Mechanismus für transiente Fehler (5xx, Netzwerk-Timeouts). Wenn NocoDB kurzzeitig nicht erreichbar ist, schlagen alle CRUD-Operationen sofort fehl. Für Production-Betrieb mit geschäftskritischen Workflows sind Retry-Logik und Circuit-Breaker essentiell.

Die aktuelle Implementierung hat bereits ein client-seitiges Rate-Limiting (200ms), aber keine Resilience-Patterns.

## What Changes

- Retry-Logik mit exponentiellem Back-off für NocoDB-API-Calls (axios-retry oder eigener Interceptor)
- Circuit-Breaker für anhaltende NocoDB-Ausfälle (fail-fast nach konfigurierbarer Schwelle)
- Konfigurierbare Parameter via ENV (max retries, circuit threshold, timeout)
- Health-Check berücksichtigt Circuit-Breaker-Status

## Capabilities

### New Capabilities
- `upstream-resilience`: Retry + Circuit-Breaker für NocoDB-Upstream-Aufrufe mit konfigurierbaren Schwellen.

### Modified Capabilities
- `NocoDBService` – erweiterte HTTP-Client-Konfiguration
- `HealthController` – Rückmeldung über Circuit-Breaker-Status

## Impact

- Neue Abhängigkeiten: `axios-retry` (oder manuelle Retry-Logik), `opossum` (für Circuit-Breaker)
- Konfiguration: Neue ENV-Variablen (alle mit Defaults)
- Latenz: Retry kann bei transienten Fehlern die Antwortzeit erhöhen (gewollt)
- Keine Änderung des API-Contracts
