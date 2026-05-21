## ADDED Requirements

### Requirement: Tabellenrechte verwalten
Das System MUST berechtigten Entwicklern ermöglichen, CRUD-Rechte für spezifische NocoDB-Tabellen pro Rolle oder Benutzer zu setzen und zu aktualisieren, wobei Subjektbezüge über `LinkToAnotherRecord`-Felder modelliert werden.

#### Scenario: Entwickler setzt CRUD-Rechte für Rolle
- **WHEN** ein berechtigter Entwickler für eine Rolle CRUD-Rechte auf eine Tabelle definiert
- **THEN** das System MUST die Rechte übernehmen, die Rollenbeziehung über das vorgesehene `LinkToAnotherRecord`-Feld speichern und als aktuelle Konfiguration persistieren

### Requirement: Rechtekonfiguration validieren
Das System SHALL eingehende Rechtekonfigurationen auf gültige Tabellenreferenzen, Zielsubjekte und erlaubte CRUD-Felder validieren.

#### Scenario: Ungültige Tabellenreferenz
- **WHEN** eine Rechtevergabe für eine nicht existierende oder nicht erlaubte Tabelle angefragt wird
- **THEN** das System MUST die Anfrage mit einem validierungsbezogenen Fehler ablehnen

### Requirement: Nur privilegierte Akteure dürfen Rechte ändern
Das System MUST Mutationen an Tabellenrechten auf privilegierte Rollen beschränken.

#### Scenario: Unprivilegierter Nutzer ruft Set-Permissions auf
- **WHEN** ein Nutzer ohne ausreichende Berechtigungen versucht, Tabellenrechte zu ändern
- **THEN** das System MUST den Request mit Forbidden ablehnen