## ADDED Requirements

### Requirement: Prometheus-Metrics-Endpoint
Die Middleware SHALL einen `/metrics`-Endpoint bereitstellen, der Prometheus-kompatible Metriken im Text-Format ausliefert.

#### Scenario: Metriken abrufen
- **GIVEN** die Middleware läuft und hat Requests verarbeitet
- **WHEN** `GET /metrics` aufgerufen wird
- **THEN** wird eine Response mit `Content-Type: text/plain; version=0.0.4` und Prometheus-Metriken zurückgegeben

### Requirement: HTTP-Request-Metriken
Die Middleware SHALL die Anzahl, Dauer und Fehlerquote von HTTP-Requests als Prometheus-Metriken erfassen.

#### Scenario: Request-Counter
- **GIVEN** ein Client ruft `GET /api/health` auf
- **WHEN** der Request abgeschlossen ist
- **THEN** wird der Counter `http_requests_total{method="GET", route="/api/health", status="200"}` um 1 erhöht

#### Scenario: Request-Dauer
- **GIVEN** ein Client ruft einen Endpoint auf
- **WHEN** der Request abgeschlossen ist
- **THEN** wird ein Histogram-Eintrag `http_request_duration_seconds` mit der gemessenen Dauer erfasst

### Requirement: Cache-Metriken
Die Middleware SHALL Cache-Treffer und -Fehlversuche als Prometheus-Metriken erfassen.

#### Scenario: Cache-Hit
- **GIVEN** ein GET-Request wird gecached
- **WHEN** der Cache einen Treffer meldet
- **THEN** wird `cache_hits_total` inkrementiert

#### Scenario: Cache-Miss
- **GIVEN** ein GET-Request wird gecached
- **WHEN** der Cache keinen Treffer meldet
- **THEN** wird `cache_misses_total` inkrementiert
