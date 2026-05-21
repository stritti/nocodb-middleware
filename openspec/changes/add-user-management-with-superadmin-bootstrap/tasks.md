## 1. Domain- und Datenmodell vorbereiten

- [ ] 1.1 Datenstrukturen für Benutzer, Rollen und Rechte in den zuständigen Modulen festlegen
- [ ] 1.2 Persistenzpfade für Benutzerstatus und Rollenzuordnungen mit bestehenden NocoDB-Tabellen abstimmen
- [ ] 1.3 Passwort-Hashing-Strategie verbindlich im User-Service verankern

## 2. SuperAdmin-Bootstrap implementieren

- [ ] 2.1 ENV-Parameter für SuperAdmin-Identität und Initialpasswort definieren und validieren
- [ ] 2.2 Idempotenten Bootstrap im Initialisierungsprozess integrieren (nur anlegen, wenn nicht vorhanden)
- [ ] 2.3 Fehlerpfad für unvollständige oder unsichere Bootstrap-Konfiguration mit nicht-sensitivem Logging ergänzen
- [ ] 2.4 Tests für Erststart, Neustart und Fehlkonfiguration des Bootstraps ergänzen

## 3. Benutzerverwaltungs-APIs absichern

- [ ] 3.1 Endpunkte für Benutzeranlage sowie Aktivieren/Deaktivieren bereitstellen oder erweitern
- [ ] 3.2 Guard- und Rollenprüfungen für Admin-only Verwaltungsoperationen durchsetzen
- [ ] 3.3 Sicherstellen, dass API-Responses keine sensiblen Passwort-/Hash-Felder zurückgeben
- [ ] 3.4 Tests für erlaubte und verbotene Benutzerverwaltungszugriffe erweitern

## 4. Rollen- und Rechtemodell durchsetzen

- [ ] 4.1 Service-Logik für Rollenanlage und Rechtezuweisung auf Zielressourcen ergänzen
- [ ] 4.2 Effektive Rechteaggregation bei Mehrfachrollen deterministisch implementieren
- [ ] 4.3 Deny-by-default-Verhalten für nicht definierte Rechte in Permission-Checks absichern
- [ ] 4.4 Regressionstests für rollenbasierte CRUD-Berechtigungsentscheidungen ausführen

## 5. Validierung und Betriebsdokumentation

- [ ] 5.1 Relevante Unit- und Integrations-Tests für Auth, Users, Roles und Permissions vollständig ausführen
- [ ] 5.2 Sicherheitsrelevante Logs auf Sensitivitätslecks prüfen und bereinigen
- [ ] 5.3 ENV- und Betriebsdokumentation für SuperAdmin-Bootstrap in `docs/` aktualisieren
- [ ] 5.4 Rollout-/Rollback-Hinweise für Einführung der lokalen Benutzerverwaltung festhalten