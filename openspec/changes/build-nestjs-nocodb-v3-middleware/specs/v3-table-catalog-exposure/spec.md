## ADDED Requirements

### Requirement: Optionale Tabellenkatalog-API auf Basis von NocoDB V3 Meta
Die Middleware MUST optional eine API bereitstellen, die bestehende Tabellen aus der NocoDB-Base über den Meta-Pfad auflistet und ein transparentes Name↔ID-Mapping liefert.

#### Scenario: Tabellenkatalog wird abgefragt
- **WHEN** ein berechtigter Client den Tabellenkatalog-Endpunkt aufruft
- **THEN** die Middleware MUST eine Liste mit mindestens `id` und `table_name` je Tabelle zurückgeben

### Requirement: Interne Middleware-Systemtabellen ausblenden
Die Middleware SHALL intern angelegte Systemtabellen für Benutzer- und Berechtigungsverwaltung standardmäßig aus dem externen Tabellenkatalog ausblenden.

#### Scenario: Katalog enthält interne und fachliche Tabellen
- **WHEN** der Tabellenkatalog aus NocoDB interne Middleware-Tabellen und fachliche Tabellen enthält
- **THEN** die Middleware MUST interne Systemtabellen standardmäßig aus der API-Antwort ausschließen

### Requirement: V3-orientierte transparente Antwortstruktur
Die Middleware MUST die Antwortstruktur des Tabellenkatalogs so gestalten, dass sie sich semantisch eng an NocoDB V3 Meta orientiert und nur minimale Middleware-spezifische Anreicherung enthält.

#### Scenario: Client mappt Tabellenname auf ID
- **WHEN** ein Client einen Tabellennamen auf die zugehörige ID mappen will
- **THEN** die Middleware MUST die dafür erforderlichen Felder ohne proprietäre Umdeutung bereitstellen
