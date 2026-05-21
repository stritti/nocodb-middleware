## ADDED Requirements

### Requirement: Tabellenrechte in NocoDB über LinkToAnotherRecord persistieren
Das System MUST alle vergebenen Tabellen-CRUD-Rechte in einer definierten NocoDB-Schemastruktur persistent speichern und Relationen über `LinkToAnotherRecord`-Felder modellieren.

#### Scenario: Rechte werden neu angelegt
- **WHEN** eine neue Rechtezuweisung erstellt wird
- **THEN** das System MUST einen entsprechenden Permission-Datensatz in NocoDB erzeugen und die Subjektbeziehung (z. B. Rolle) über das vorgesehene `LinkToAnotherRecord`-Feld setzen

### Requirement: Persistenzstruktur idempotent initialisieren
Das System SHALL fehlende Permission-Tabellen und erforderliche Felder beim Start idempotent initialisieren.

#### Scenario: Anwendung startet erneut
- **WHEN** die Anwendung mit bereits existierender Permission-Struktur neu startet
- **THEN** das System MUST keine doppelten Strukturen anlegen und bestehende Strukturen weiterverwenden

### Requirement: Rechteänderungen konsistent aktualisieren
Das System MUST Änderungen an bestehenden Tabellenrechten als konsistente Updates in NocoDB persistieren und bestehende `LinkToAnotherRecord`-Bezüge konsistent halten.

#### Scenario: CRUD-Rechte werden angepasst
- **WHEN** ein berechtigter Akteur bestehende Rechte (z. B. can_update) ändert
- **THEN** das System MUST den zugehörigen Permission-Datensatz in NocoDB aktualisieren, ohne die referenzierten `LinkToAnotherRecord`-Beziehungen inkonsistent zu machen