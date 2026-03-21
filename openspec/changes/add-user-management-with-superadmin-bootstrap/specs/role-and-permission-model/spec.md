## ADDED Requirements

### Requirement: Rollen und Rechte modellieren
Das System MUST Rollen und zugehörige Rechte strukturiert modellieren, sodass Berechtigungen pro Aktion und Zielressource prüfbar sind.

#### Scenario: Rolle erhält tabellenbezogene Rechte
- **WHEN** ein Admin einer Rolle Rechte für definierte CRUD-Aktionen auf einer Tabelle zuweist
- **THEN** das System MUST diese Rechte persistieren und für Autorisierungsentscheidungen verfügbar machen

### Requirement: Effektive Rechte aus Rollen ableiten
Das System SHALL die effektiven Rechte eines Benutzers aus allen zugewiesenen Rollen deterministisch ableiten.

#### Scenario: Benutzer mit mehreren Rollen
- **WHEN** ein Benutzer mehrere Rollen mit unterschiedlichen Rechten besitzt
- **THEN** das System MUST die effektiven Berechtigungen konsistent aggregieren und für Guard-Checks verwenden

### Requirement: Deny-by-default für nicht definierte Rechte
Das System MUST Zugriffe standardmäßig verweigern, wenn keine explizite Berechtigung vorliegt.

#### Scenario: Aktion ohne Rechtezuweisung
- **WHEN** ein Benutzer eine Aktion auf einer Ressource ausführt, für die keine Berechtigung definiert ist
- **THEN** das System MUST den Zugriff ablehnen