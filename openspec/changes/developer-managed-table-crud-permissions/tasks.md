## 1. Permission-Schema in NocoDB absichern

- [ ] 1.1 Zielstruktur für persistierte Tabellenrechte (z. B. table_permissions + Schlüsselattribute) finalisieren
- [ ] 1.2 Idempotente Initialisierung fehlender Permission-Tabellen/Felder in der Startlogik ergänzen
- [ ] 1.3 Integrationsnahe Tests für Erstinitialisierung und Wiederanlauf ohne Duplikate ergänzen

## 2. APIs für Rechtevergabe bereitstellen

- [ ] 2.1 Endpunkte/DTOs für Setzen, Aktualisieren und Lesen tabellenbezogener CRUD-Rechte implementieren oder erweitern
- [ ] 2.2 Eingabevalidierung für Tabellenreferenz, Zielsubjekt (Rolle/Benutzer) und CRUD-Felder durchsetzen
- [ ] 2.3 Admin-/Developer-only Zugriffsschutz für Rechte-Mutationen via Guard/Decorator absichern
- [ ] 2.4 Tests für erlaubte und verbotene Rechte-Mutationspfade ergänzen

## 3. Laufzeit-Enforcement auf persistierten Rechten umstellen

- [ ] 3.1 Permissions-Service so erweitern, dass Entscheidungen auf NocoDB-persistierten Rechten basieren
- [ ] 3.2 Default-Deny-Verhalten bei fehlender Rechtezuweisung explizit sicherstellen
- [ ] 3.3 Konfliktfreie Aggregation bei mehreren Rollen/Regeln deterministisch umsetzen
- [ ] 3.4 Guard-Tests für Create/Read/Update/Delete mit erlaubten und verweigerten Fällen ausbauen

## 4. Operability und Auditierbarkeit

- [ ] 4.1 Strukturierte Audit-Logs für abgelehnte CRUD-Zugriffe (user/action/table) ergänzen
- [ ] 4.2 Sensitivitätsprüfung der Logs durchführen (keine Secrets, keine unnötigen Payload-Daten)
- [ ] 4.3 Optionales Cache-Invalidierungsverhalten bei Rechteänderungen abstimmen und implementieren
- [ ] 4.4 Doku für Entwickler zur Rechtevergabe und Persistenzmodell in `docs/` aktualisieren

## 5. End-to-End-Validierung

- [ ] 5.1 Relevante Unit- und Integrations-Tests für Permissions, Roles, Users und NocoDB-Service ausführen
- [ ] 5.2 Regressionsprüfung für bestehende RBAC-Pfade durchführen
- [ ] 5.3 Staging-Check für Vergabe → Persistenz → Enforcement durchführen
- [ ] 5.4 Rollout-/Rollback-Hinweise für das neue Rechteverwaltungsmodell dokumentieren