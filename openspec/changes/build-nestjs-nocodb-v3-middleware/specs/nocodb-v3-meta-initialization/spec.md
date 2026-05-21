## ADDED Requirements

### Requirement: Idempotente Tabelleninitialisierung über V3 Meta API
Die Middleware MUST Tabelleninitialisierung idempotent durchführen, sodass wiederholte Starts keine doppelten Tabellen oder inkonsistenten Metadaten erzeugen.

#### Scenario: Anwendung startet mehrfach
- **WHEN** die Initialisierung mehrfach nacheinander ausgeführt wird
- **THEN** die Middleware MUST bestehende Tabellen erkennen und keine Duplikate anlegen

### Requirement: Deterministische Spaltendefinitionen
Die Middleware SHALL Spaltendefinitionen pro Zieltabelle deterministisch verwalten und fehlende Spalten nachziehen, ohne bestehende kompatible Spalten zu zerstören.

#### Scenario: Fehlende Spalte in existierender Tabelle
- **WHEN** eine erforderliche Spalte in einer vorhandenen Tabelle fehlt
- **THEN** die Middleware MUST genau diese Spalte über den Meta-Pfad erstellen und den Rest unverändert lassen

### Requirement: Resiliente Initialisierung mit Wiederanlaufbarkeit
Die Middleware MUST Initialisierungsschritte so ausführen, dass partielle Fehler geloggt, eindeutig eingeordnet und bei erneutem Start sauber fortgesetzt werden können.

#### Scenario: Upstream-Fehler während Initialisierung
- **WHEN** ein Meta-API-Aufruf temporär fehlschlägt
- **THEN** die Middleware MUST den Fehler protokollieren und bei erneutem Lauf konsistent weiterarbeiten können
