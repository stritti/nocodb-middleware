## ADDED Requirements

### Requirement: Response-Kompression
Die Middleware SHALL HTTP-Responses automatisch mit gzip komprimieren, wenn der Client `Accept-Encoding: gzip` sendet und die Response größer als 1KB ist.

#### Scenario: Komprimierte Response
- **GIVEN** ein Client sendet `Accept-Encoding: gzip`
- **WHEN** ein GET-Request mit einer Response > 1KB verarbeitet wird
- **THEN** wird die Response mit `Content-Encoding: gzip` komprimiert ausgeliefert

#### Scenario: Kleine Response bleibt unkomprimiert
- **GIVEN** ein Client sendet `Accept-Encoding: gzip`
- **WHEN** ein GET-Request mit einer Response < 1KB verarbeitet wird
- **THEN** wird die Response unkomprimiert ausgeliefert

### Requirement: Konfigurierbare Kompression
Die Middleware SHALL die Kompression über die ENV-Variablen `COMPRESSION_ENABLED` (default: true) und `COMPRESSION_LEVEL` (default: 6) konfigurierbar machen.

#### Scenario: Kompression deaktiviert
- **GIVEN** `COMPRESSION_ENABLED=false` ist gesetzt
- **WHEN** die App startet
- **THEN** wird keine Compression-Middleware registriert
