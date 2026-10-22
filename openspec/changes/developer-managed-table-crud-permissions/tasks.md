## 1. Permission-Schema in NocoDB absichern

- [x] 1.1 Zielstruktur für persistierte Tabellenrechte (z. B. table_permissions + Schlüsselattribute) finalisieren _(Tabelle `table_permissions`)_
- [ ] 1.2 Idempotente Initialisierung fehlender Permission-Tabellen/Felder in der Startlogik ergänzen _(Link-Felder werden nicht angelegt; behoben in #287 (numerische `user_id`/`role_id`))_
- [ ] 1.3 Integrationsnahe Tests für Erstinitialisierung und Wiederanlauf ohne Duplikate ergänzen

## 2. APIs für Rechtevergabe bereitstellen

- [x] 2.1 Endpunkte/DTOs für Setzen, Aktualisieren und Lesen tabellenbezogener CRUD-Rechte implementieren oder erweitern
- [ ] 2.2 Eingabevalidierung für Tabellenreferenz, Zielsubjekt (Rolle/Benutzer) und CRUD-Felder durchsetzen
- [x] 2.3 Admin-/Developer-only Zugriffsschutz für Rechte-Mutationen via Guard/Decorator absichern
- [ ] 2.4 Tests für erlaubte und verbotene Rechte-Mutationspfade ergänzen

## 3. Laufzeit-Enforcement auf persistierten Rechten umstellen

- [x] 3.1 Permissions-Service so erweitern, dass Entscheidungen auf NocoDB-persistierten Rechten basieren
- [x] 3.2 Default-Deny-Verhalten bei fehlender Rechtezuweisung explizit sicherstellen
- [x] 3.3 Konfliktfreie Aggregation bei mehreren Rollen/Regeln deterministisch umsetzen
- [ ] 3.4 Guard-Tests für Create/Read/Update/Delete mit erlaubten und verweigerten Fällen ausbauen

## 4. Operability und Auditierbarkeit

- [ ] 4.1 Strukturierte Audit-Logs für abgelehnte CRUD-Zugriffe (user/action/table) ergänzen _(Log ist unstrukturiert; strukturierte Felder mit #289)_
- [ ] 4.2 Sensitivitätsprüfung der Logs durchführen (keine Secrets, keine unnötigen Payload-Daten)
- [ ] 4.3 Optionales Cache-Invalidierungsverhalten bei Rechteänderungen abstimmen und implementieren
- [x] 4.4 Doku für Entwickler zur Rechtevergabe und Persistenzmodell in `docs/` aktualisieren _(docs/rbac-api.md)_

## 5. End-to-End-Validierung

- [ ] 5.1 Relevante Unit- und Integrations-Tests für Permissions, Roles, Users und NocoDB-Service ausführen
- [ ] 5.2 Regressionsprüfung für bestehende RBAC-Pfade durchführen
- [ ] 5.3 Staging-Check für Vergabe → Persistenz → Enforcement durchführen
- [ ] 5.4 Rollout-/Rollback-Hinweise für das neue Rechteverwaltungsmodell dokumentieren