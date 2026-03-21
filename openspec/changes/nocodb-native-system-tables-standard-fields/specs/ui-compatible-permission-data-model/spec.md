## ADDED Requirements

### Requirement: Berechtigungsdaten in NocoDB-UI editierbar halten
Das System MUST Berechtigungsdatensätze so speichern, dass Entwickler/Admins sie in der NocoDB-Oberfläche direkt lesen und bearbeiten können.

#### Scenario: Admin ändert CRUD-Rechte in NocoDB-UI
- **WHEN** ein Admin in der NocoDB-UI einen Permission-Datensatz bearbeitet
- **THEN** das System MUST die Änderung in nachfolgenden Berechtigungsprüfungen berücksichtigen

### Requirement: Service-Logik auf standardisierte Felder und LTAR-Relationen ausrichten
Das System SHALL Service- und Guard-Logik auf die standardisierten Systemfeldnamen und `LinkToAnotherRecord`-Relationen ausrichten, sodass Les- und Schreiboperationen konsistent bleiben.

#### Scenario: Permission-Check liest Tabellenrechte
- **WHEN** die Middleware einen CRUD-Permission-Check ausführt
- **THEN** das System MUST die erforderlichen Rechte aus den standardisierten NocoDB-Feldern und den definierten `LinkToAnotherRecord`-Beziehungen auswerten

### Requirement: Konsistente Darstellung von Benutzer- und Rollenbezügen
Das System MUST Benutzer-, Rollen- und Rechtebezüge in der UI konsistent darstellbar machen.

#### Scenario: Entwickler prüft Rollenbeziehungen eines Benutzers
- **WHEN** ein Entwickler den Benutzerdatensatz und zugehörige Rollen in NocoDB betrachtet
- **THEN** das System MUST die Beziehungen eindeutig und widerspruchsfrei darstellen