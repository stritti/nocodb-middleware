## ADDED Requirements

### Requirement: Runtime-Enforcement auf persistierten Rechten
Das System MUST jede CRUD-Anfrage gegen die in NocoDB persistierten Tabellenrechte prüfen, bevor die Aktion ausgeführt wird.

#### Scenario: Benutzer ohne Update-Recht
- **WHEN** ein Benutzer eine Update-Aktion auf einer Tabelle ohne entsprechendes Recht ausführt
- **THEN** das System MUST den Zugriff verweigern

### Requirement: Default-Deny bei fehlender Rechtezuweisung
Das System SHALL Zugriffe standardmäßig ablehnen, wenn für Benutzer/Rolle und Tabelle keine explizite Rechtezuweisung existiert.

#### Scenario: Keine Rechte für Tabelle vorhanden
- **WHEN** eine CRUD-Anfrage für eine Tabelle ohne passende Rechtezuweisung eingeht
- **THEN** das System MUST den Request mit Forbidden ablehnen

### Requirement: Berechtigungsentscheidungen nachvollziehbar protokollieren
Das System MUST abgelehnte Zugriffe mit Benutzerkontext, Aktion und Tabelle strukturiert protokollieren, ohne sensible Secrets zu loggen.

#### Scenario: Zugriff wird aufgrund fehlender Rechte blockiert
- **WHEN** ein Request wegen fehlender CRUD-Berechtigung abgelehnt wird
- **THEN** das System MUST einen strukturierten Audit-Logeintrag erzeugen