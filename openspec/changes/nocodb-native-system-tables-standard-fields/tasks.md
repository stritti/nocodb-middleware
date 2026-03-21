## 1. Zielschema für NocoDB-Systemtabellen definieren

- [ ] 1.1 Standardfelder und Feldtypen für Users, Roles, User Roles und Table Permissions verbindlich spezifizieren
- [ ] 1.2 Konventionen für Feldnamen/Titles so festlegen, dass sie in der NocoDB-UI eindeutig verständlich sind
- [ ] 1.3 Relationsmodell zwischen Benutzern, Rollen und Berechtigungen für UI-kompatible Darstellung finalisieren

## 2. Idempotente Provisionierung umsetzen

- [ ] 2.1 Initialisierungslogik in `database-initialization.service` auf das definierte Standardschema erweitern
- [ ] 2.2 Existenzprüfungen pro Tabelle und Feld ergänzen, um Duplikate bei Neustarts zu verhindern
- [ ] 2.3 Fehlende Standardfelder in bestehenden Tabellen automatisch und deterministisch nachziehen
- [ ] 2.4 Strukturierte Fehlerlogs für fehlgeschlagene Tabellen-/Feldanlage ergänzen

## 3. Service-Kompatibilität mit neuem Feldmodell herstellen

- [ ] 3.1 Zugriffe in Permissions-/Users-/Roles-Services auf standardisierte Feldnamen ausrichten
- [ ] 3.2 Übergangsweise Feldmappings für Bestandsdaten ergänzen, falls Legacy-Felder vorhanden sind
- [ ] 3.3 Runtime-Permission-Checks gegen das neue UI-kompatible Feldmodell validieren
- [ ] 3.4 Sicherstellen, dass UI-Änderungen an Permission-Datensätzen im Enforcement wirksam werden

## 4. Tests und Datenvalidierung

- [ ] 4.1 Unit-Tests für Schemaaufbau und idempotente Provisionierung erweitern
- [ ] 4.2 Integrationsnahe Tests für Tabellenbeziehungen und standardisierte Feldtypen ergänzen
- [ ] 4.3 Regressionstests für Benutzer-/Rollen-/Permission-Flows mit neuem Schema ausführen
- [ ] 4.4 Testfälle für Bearbeitung in NocoDB-UI und anschließende Laufzeitwirkung ergänzen

## 5. Migration und Dokumentation

- [ ] 5.1 Migrationsstrategie für bestehende Instanzen mit Legacy-Feldern festlegen und umsetzen
- [ ] 5.2 Rollback-Strategie für Schemaänderungen dokumentieren
- [ ] 5.3 Entwicklerdoku in `docs/` zu Standardfeldern und Tabellenbeziehungen aktualisieren
- [ ] 5.4 Betriebscheckliste für Verifikation des NocoDB-nativen Systemschemas bereitstellen