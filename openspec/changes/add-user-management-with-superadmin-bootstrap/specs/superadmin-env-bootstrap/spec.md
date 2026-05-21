## ADDED Requirements

### Requirement: SuperAdmin aus ENV bootstrapen
Das System MUST beim Start optional einen initialen SuperAdmin aus konfigurierten ENV-Werten anlegen, wenn noch kein entsprechender Account existiert.

#### Scenario: Erster Start mit gültigen ENV-Werten
- **WHEN** die Anwendung startet und gültige SuperAdmin-ENV-Werte gesetzt sind
- **THEN** das System MUST einen SuperAdmin-Account mit den konfigurierten Identitätsdaten erstellen

### Requirement: Bootstrap idempotent ausführen
Das System SHALL den SuperAdmin-Bootstrap idempotent ausführen, sodass wiederholte Starts keinen zweiten identischen SuperAdmin erzeugen.

#### Scenario: Neustart nach bereits erfolgtem Bootstrap
- **WHEN** die Anwendung erneut startet und der SuperAdmin bereits vorhanden ist
- **THEN** das System MUST keinen Duplikat-Account anlegen

### Requirement: Unsichere Bootstrap-Konfiguration erkennen
Das System MUST unsichere oder unvollständige SuperAdmin-ENV-Konfigurationen erkennen und entsprechend restriktiv reagieren.

#### Scenario: Fehlendes oder zu schwaches Initialpasswort
- **WHEN** SuperAdmin-Bootstrap aktiviert ist, aber erforderliche Credentials fehlen oder die Passwortpolicy verletzt wird
- **THEN** das System MUST den Bootstrap verweigern und einen klaren, nicht-sensitiven Fehlerzustand protokollieren