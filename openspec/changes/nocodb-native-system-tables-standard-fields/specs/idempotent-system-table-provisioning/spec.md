## ADDED Requirements

### Requirement: Idempotente Provisionierung der Systemtabellen
Das System MUST Systemtabellen und Standardfelder beim Start idempotent provisionieren, ohne doppelte Tabellen oder Spalten zu erzeugen.

#### Scenario: Wiederholter Start mit bestehendem Schema
- **WHEN** die Anwendung erneut startet und Systemtabellen bereits vorhanden sind
- **THEN** das System MUST das bestehende Schema wiederverwenden und keine Duplikate anlegen

### Requirement: Fehlende Standardfelder nachziehen
Das System SHALL fehlende Felder in bestehenden Systemtabellen automatisch ergänzen, wenn diese Teil des definierten Standardschemas sind.

#### Scenario: Ein Pflichtfeld fehlt in Roles-Tabelle
- **WHEN** die Initialisierung eine bestehende Roles-Tabelle ohne erforderliches Standardfeld findet
- **THEN** das System MUST das fehlende Feld hinzufügen und den Rest unverändert lassen

### Requirement: Provisionierungsfehler nachvollziehbar protokollieren
Das System MUST Fehler während der Schema-Provisionierung strukturiert protokollieren, damit Korrekturen reproduzierbar möglich sind.

#### Scenario: Feldanlage schlägt fehl
- **WHEN** ein Feld in einer Systemtabelle nicht angelegt werden kann
- **THEN** das System MUST einen strukturierten Fehler mit Tabellen- und Feldkontext loggen