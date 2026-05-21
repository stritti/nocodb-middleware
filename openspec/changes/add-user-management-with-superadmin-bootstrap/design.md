## Context

Die Middleware benötigt eine eigene Benutzerverwaltung, um Authentifizierung und Autorisierung unabhängig von Frontend-Logik durchzusetzen. Dafür müssen Benutzer, Rollen und Rechte intern modelliert werden. Zusätzlich ist ein sicherer Erstzugang erforderlich: ein initialer SuperAdmin, der über Umgebungsvariablen bereitgestellt und beim Start kontrolliert gebootstrapped wird.

Randbedingungen:
- Der Bootstrap-Account darf nicht bei jedem Start dupliziert werden.
- Passwörter müssen sicher gehasht gespeichert werden.
- Nur privilegierte Benutzer dürfen weitere Benutzer verwalten.
- Rollen und Rechte müssen mit bestehenden Guards/Permissions konsistent sein.

## Goals / Non-Goals

**Goals:**
- Lokale Benutzerverwaltung für Erstellen, Aktivieren/Deaktivieren und Rollenzuweisung bereitstellen.
- Rollen-/Rechtemodell für tabellenbezogene Zugriffskontrolle definieren und durchsetzen.
- SuperAdmin-Bootstrap aus ENV sicher und idempotent implementieren.
- Verwaltungsoperationen ausschließlich für berechtigte Admin-Benutzer zulassen.
- Testbare Sicherheitsregeln für Passwort, Bootstrap und Berechtigungen einführen.

**Non-Goals:**
- Kein Self-Registration-Flow für Endnutzer.
- Keine externe IAM-/SSO-Integration.
- Kein UI-Frontend für Benutzerverwaltung in diesem Change.
- Keine mandantenfähige Multi-Realm-Userverwaltung.

## Decisions

1. **Interne User/Roles/Permissions als zentrale Domain-Objekte**
   - Entscheidung: Benutzer, Rollen und Rechte werden als eigene Domänenmodelle innerhalb der Middleware geführt.
   - Begründung: Konsistente Enforcement-Punkte und geringe Abhängigkeit vom Frontend.
   - Alternative: Rechte nur implizit in Controllern hardcodieren. Verworfen wegen schlechter Wartbarkeit.

2. **SuperAdmin-Bootstrap über dedizierte ENV-Parameter**
   - Entscheidung: Startup prüft konfigurierte SuperAdmin-Credentials und legt den Account nur an, falls nicht vorhanden.
   - Begründung: Sicherer, reproduzierbarer Erstzugang ohne manuelle Datenbankeingriffe.
   - Alternative: Hardcodierter Default-Admin. Verworfen wegen Sicherheitsrisiko.

3. **Passwortschutz mit starker Hashing-Strategie**
   - Entscheidung: Klarer Hashing-Standard und Verbot von Klartextspeicherung.
   - Begründung: Schutz bei Datenleck und Compliance mit grundlegenden Security-Anforderungen.
   - Alternative: Unsicheres SHA-only oder reversible Speicherung. Verworfen wegen unzureichender Sicherheit.

4. **Admin-only Management APIs**
   - Entscheidung: Benutzeranlage/-verwaltung nur durch SuperAdmin oder entsprechend berechtigte Rollen.
   - Begründung: Minimiert Missbrauchspotenzial und hält Verantwortlichkeiten klar.
   - Alternative: Jeder authentifizierte User kann weitere User anlegen. Verworfen wegen Eskalationsrisiko.

5. **Idempotenter Bootstrap + Auditierbare Logs**
   - Entscheidung: Bootstrap ist wiederanlauffähig und erzeugt nachvollziehbare, nicht-sensitive Logs.
   - Begründung: Betriebssicherheit bei Neustarts und bessere Nachvollziehbarkeit.
   - Alternative: Einmaliger Best-Effort ohne Prüfung. Verworfen wegen Drift-/Fehlerrisiko.

## Risks / Trade-offs

- **[Fehlkonfigurierte ENV-Credentials eröffnen schwachen Initialzugang]** → Mitigation: Mindestanforderungen für Passwort, Startwarnungen und klare Doku.
- **[Zu breite Admin-Rechte führen zu Privilegieneskalation]** → Mitigation: Striktes Rollenmodell, Guard-Checks, Tests für deny-by-default.
- **[Bootstrap-Race bei parallelem Start]** → Mitigation: Existenzprüfung + idempotente Create-Strategie.
- **[Mehr Security-Checks erhöhen Komplexität]** → Mitigation: Klare Servicegrenzen und fokussierte Unit-/Integrationstests.

## Migration Plan

1. Domain- und Service-Schicht für Benutzer, Rollen und Rechte finalisieren.
2. ENV-basierte SuperAdmin-Konfiguration definieren und Validierung ergänzen.
3. Idempotenten Bootstrap im Initialisierungsprozess integrieren.
4. Admin-Management-Endpunkte mit Guards und Permission-Checks absichern.
5. Tests für Bootstrap, Rollenrechte und Passwortsicherheit ausführen; anschließend Staging-Rollout.

## Open Questions

- Soll der initiale SuperAdmin nach dem ersten erfolgreichen Login zur Passwortänderung gezwungen werden?
- Welche Mindest-Passwortpolicy (Länge/Komplexität) ist verbindlich?
- Sollen Änderungen an Rollen/Rechten versioniert oder audit-logbar persistiert werden?