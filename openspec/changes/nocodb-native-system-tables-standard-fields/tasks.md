## 1. Zielschema für NocoDB-Systemtabellen definieren

- [x] 1.1 Standardfelder und Feldtypen für Users, Roles, User Roles und Table Permissions verbindlich spezifizieren _(`docs/database-schema.md`)_
- [x] 1.2 Konventionen für Feldnamen/Titles so festlegen, dass sie in der NocoDB-UI eindeutig verständlich sind _(Feldtitel = Namen im Code)_
- [x] 1.3 Relationsmodell zwischen Benutzern, Rollen und Berechtigungen für UI-kompatible Darstellung finalisieren _(numerische `user_id`/`role_id` statt Link-Feldern)_

## 2. Idempotente Provisionierung umsetzen

- [x] 2.1 Initialisierungslogik in `database-initialization.service` auf das definierte Standardschema erweitern _(#287)_
- [x] 2.2 Existenzprüfungen pro Tabelle und Feld ergänzen, um Duplikate bei Neustarts zu verhindern _(#287)_
- [x] 2.3 Fehlende Standardfelder in bestehenden Tabellen automatisch und deterministisch nachziehen _(#287)_
- [ ] 2.4 Strukturierte Fehlerlogs für fehlgeschlagene Tabellen-/Feldanlage ergänzen

## 3. Service-Kompatibilität mit neuem Feldmodell herstellen

- [x] 3.1 Zugriffe in Permissions-/Users-/Roles-Services auf standardisierte Feldnamen ausrichten
- [x] 3.2 Übergangsweise Feldmappings für Bestandsdaten ergänzen, falls Legacy-Felder vorhanden sind _(entfällt: Altschema bis 0.7.x wird nicht unterstützt)_
- [x] 3.3 Runtime-Permission-Checks gegen das neue UI-kompatible Feldmodell validieren _(Integrationstests)_
- [ ] 3.4 Sicherstellen, dass UI-Änderungen an Permission-Datensätzen im Enforcement wirksam werden

## 4. Tests und Datenvalidierung

- [x] 4.1 Unit-Tests für Schemaaufbau und idempotente Provisionierung erweitern
- [x] 4.2 Integrationsnahe Tests für Tabellenbeziehungen und standardisierte Feldtypen ergänzen _(Integrationstests)_
- [x] 4.3 Regressionstests für Benutzer-/Rollen-/Permission-Flows mit neuem Schema ausführen _(Integrationstests)_
- [ ] 4.4 Testfälle für Bearbeitung in NocoDB-UI und anschließende Laufzeitwirkung ergänzen

## 5. Migration und Dokumentation

- [x] 5.1 Migrationsstrategie für bestehende Instanzen mit Legacy-Feldern festlegen und umsetzen _(keine Migration: Start bricht bei Alttabellen ab, siehe `docs/database-schema.md`)_
- [ ] 5.2 Rollback-Strategie für Schemaänderungen dokumentieren
- [x] 5.3 Entwicklerdoku in `docs/` zu Standardfeldern und Tabellenbeziehungen aktualisieren
- [ ] 5.4 Betriebscheckliste für Verifikation des NocoDB-nativen Systemschemas bereitstellen