## ADDED Requirements

### Requirement: Retry bei transienten NocoDB-Fehlern
Der NocoDBService SHALL bei transienten Fehlern (HTTP 5xx, Netzwerk-Timeouts, Verbindungsabbrüche) automatisch bis zu 3 Wiederholungen mit exponentiellem Back-off durchführen.

#### Scenario: Erfolgreicher Retry nach 503
- **GIVEN** NocoDB antwortet mit 503 Service Unavailable
- **WHEN** der NocoDBService einen Request sendet
- **THEN** wird der Request bis zu 3 Mal mit Back-off wiederholt

#### Scenario: Kein Retry bei 4xx
- **GIVEN** NocoDB antwortet mit 400 Bad Request
- **WHEN** der NocoDBService einen Request sendet
- **THEN** wird der Fehler sofort weitergegeben (kein Retry)

#### Scenario: Max Retries erschöpft
- **GIVEN** NocoDB antwortet dauerhaft mit 503
- **WHEN** 3 Retries fehlschlagen
- **THEN** wird der Fehler an den Aufrufer weitergereicht

### Requirement: Circuit-Breaker für anhaltende Ausfälle
Der NocoDBService SHALL einen Circuit-Breaker implementieren, der bei anhaltenden Fehlern öffnet und Anfragen für eine konfigurierbare Dauer sofort fehlschlagen lässt (fail-fast).

#### Scenario: Circuit öffnet
- **GIVEN** 5 aufeinanderfolgende Requests schlagen fehl
- **WHEN** ein weiterer Request eingeht
- **THEN** wird der Request sofort mit einem CircuitOpenError abgewiesen (ohne NocoDB-Aufruf)

#### Scenario: Circuit schließt wieder
- **GIVEN** der Circuit ist offen
- **WHEN** die Reset-Zeit (60s) abgelaufen ist und ein Request eingeht
- **THEN** wird ein Probe-Request an NocoDB gesendet; bei Erfolg schließt der Circuit

### Requirement: Health-Check zeigt Resilience-Status
Der Health-Endpoint SHALL den Status des Circuit-Breakers (geschlossen/offen/halb-offen) und die Retry-Anzahl anzeigen.

#### Scenario: Health mit Circuit-Status
- **GIVEN** der Circuit ist geschlossen
- **WHEN** der Health-Endpoint aufgerufen wird
- **THEN** enthält die Response `circuitBreaker: "closed"` und `retryCount: 0`
