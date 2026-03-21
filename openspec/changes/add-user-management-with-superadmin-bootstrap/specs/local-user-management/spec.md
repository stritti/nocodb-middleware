## ADDED Requirements

### Requirement: Lokale Benutzerkonten verwalten
Das System MUST lokale Benutzerkonten bereitstellen und Verwaltungsoperationen für Anlegen, Aktivieren und Deaktivieren unterstützen.

#### Scenario: Admin legt neuen Benutzer an
- **WHEN** ein berechtigter Admin einen neuen Benutzer mit gültigen Pflichtfeldern anlegt
- **THEN** das System MUST den Benutzer mit inaktiv/aktiv-Status gemäß Vorgabe persistieren und eindeutig identifizierbar zurückgeben

### Requirement: Passwörter sicher speichern
Das System MUST Passwörter gehasht speichern und darf niemals Klartext-Passwörter in Persistenz, Responses oder Logs ausgeben.

#### Scenario: Benutzer wird mit Passwort erstellt
- **WHEN** ein Benutzerkonto mit Passwort angelegt wird
- **THEN** das System MUST das Passwort vor der Speicherung hashen und den Hash statt des Klartexts speichern

### Requirement: Benutzerverwaltung nur für privilegierte Rollen
Das System SHALL Benutzerverwaltungsaktionen auf privilegierte Rollen beschränken.

#### Scenario: Nicht privilegierter Benutzer ruft Create-User auf
- **WHEN** ein authentifizierter Benutzer ohne ausreichende Verwaltungsrechte einen Benutzer anlegen möchte
- **THEN** das System MUST den Request mit Forbidden ablehnen