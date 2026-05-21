## ADDED Requirements

### Requirement: V3 Data API CRUD Contract
Die Middleware MUST alle CRUD-Operationen gegen NocoDB über die V3 Data API ausführen und dabei ein konsistentes Antwortmodell für interne Aufrufer bereitstellen.

#### Scenario: Record erfolgreich erstellen
- **WHEN** ein Service eine Create-Operation mit gültigen Feldwerten anfordert
- **THEN** die Middleware MUST die Anfrage an den V3 Data Endpoint senden und ein normalisiertes Ergebnis mit Record-ID und Feldern zurückgeben

### Requirement: V3 Data API Filter, Sortierung und Pagination
Die Middleware SHALL Filter-, Sortier- und Pagination-Parameter transparent an die V3 Data API weiterreichen und die Ergebnisliste inklusive Paging-Metadaten zurückgeben.

#### Scenario: Gefilterte Liste abrufen
- **WHEN** ein Aufrufer eine List-Operation mit where, sort und limit anfordert
- **THEN** die Middleware MUST die Parameter unverfälscht an V3 übergeben und eine Liste mit den erwarteten Datensätzen liefern

### Requirement: V3-nahes API-Verhalten ohne unnötige proprietäre Abstraktion
Die Middleware MUST das Daten- und Filterverhalten semantisch eng an der NocoDB V3 API halten und darf nur minimale, dokumentierte Anpassungen für Stabilität und Sicherheit hinzufügen.

#### Scenario: Client nutzt V3-Filterausdrücke
- **WHEN** ein Client einen gültigen V3-ähnlichen Filter-/Sort-Ausdruck gegen den Middleware-Endpunkt sendet
- **THEN** die Middleware MUST diesen Ausdruck ohne proprietäre Umdeutung an den NocoDB-V3-Pfad weiterreichen oder einen klar klassifizierten Validierungsfehler zurückgeben

### Requirement: Fehlerklassifikation für Data-Aufrufe
Die Middleware MUST Fehler aus der V3 Data API klassifizieren (z. B. Validierung, Authentifizierung, Not Found, Rate-Limit, Upstream-Fehler) und in ein konsistentes Fehlerformat überführen.

#### Scenario: V3 liefert Validierungsfehler
- **WHEN** NocoDB V3 auf einen Data-Request mit einem Validierungsfehler antwortet
- **THEN** die Middleware MUST einen domänenspezifischen Fehler mit korrekter Kategorie und Ursache zurückgeben
