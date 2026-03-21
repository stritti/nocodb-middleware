## ADDED Requirements

### Requirement: Tabellenbezogene CRUD-Berechtigungsprüfung
Die Middleware MUST pro geschütztem Endpoint tabellenbezogene CRUD-Berechtigungen prüfen, bevor die eigentliche Geschäftslogik ausgeführt wird.

#### Scenario: Benutzer ohne Delete-Recht
- **WHEN** ein authentifizierter Benutzer eine Delete-Operation auf einer Tabelle ausführt, für die ihm delete fehlt
- **THEN** die Middleware MUST den Request mit Forbidden ablehnen

### Requirement: Rollen-zu-Berechtigungen-Auflösung
Die Middleware SHALL Benutzerrollen auf effektive Tabellenberechtigungen auflösen und dabei Mehrfachrollen korrekt zusammenführen.

#### Scenario: Benutzer mit zwei Rollen
- **WHEN** ein Benutzer zwei Rollen mit unterschiedlichen Rechten auf derselben Tabelle besitzt
- **THEN** die Middleware MUST die effektiven Rechte korrekt aggregieren und für die Guard-Entscheidung verwenden

### Requirement: RBAC-Entscheidungen auditierbar protokollieren
Die Middleware MUST fehlgeschlagene Berechtigungsentscheidungen mit Benutzerkontext, Aktion und Zieltabelle strukturiert protokollieren, ohne sensible Geheimnisse zu loggen.

#### Scenario: Permission-Check schlägt fehl
- **WHEN** ein Request wegen fehlender Berechtigung abgelehnt wird
- **THEN** die Middleware MUST einen strukturierten Logeintrag mit userId, action und table erzeugen
