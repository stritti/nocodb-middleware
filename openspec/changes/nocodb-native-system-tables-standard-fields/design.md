## Context

Die Middleware verwaltet Benutzer-, Rollen- und Berechtigungsdaten in NocoDB, aber die zugrunde liegenden Systemtabellen sind nicht vollständig auf die typische NocoDB-Datenmodellierung für direkte UI-Bearbeitung optimiert. Ziel ist ein Schema mit geläufigen Feldtypen und konsistenten Feldnamen, damit Entwickler/Admins Daten in der NocoDB-Oberfläche ohne zusätzliche Übersetzung pflegen können.

Randbedingungen:
- Bestehende Berechtigungslogik darf durch Feldumstellungen nicht brechen.
- Systemtabellen müssen beim Start idempotent bereitgestellt werden.
- Feldtypen sollen NocoDB-Standardtypen entsprechen (Text, Email, Checkbox, DateTime, Relation).
- Datenmigration bestehender Instanzen muss planbar und risikoarm sein.

## Goals / Non-Goals

**Goals:**
- NocoDB-native Feldstruktur für Users, Roles, User Roles und Table Permissions festlegen.
- Feldnamen und Typen so definieren, dass sie in der NocoDB-UI direkt verständlich/editierbar sind.
- Initialisierungslogik auf idempotente Provisionierung dieser Standardfelder ausrichten.
- Kompatibilität der Service-/Guard-Logik mit dem neuen Feldmodell sicherstellen.
- Tests für Schemaqualität und UI-Bearbeitbarkeit ergänzen.

**Non-Goals:**
- Kein vollständiges Re-Design aller fachlichen Prozesse der Benutzerverwaltung.
- Keine zusätzliche Admin-UI außerhalb von NocoDB.
- Keine Einführung neuer externer Speichersysteme.
- Keine feldgranulare Berechtigungslogik in diesem Schritt.

## Decisions

1. **Systemtabellen nach NocoDB-Konventionen modellieren**
   - Entscheidung: Standardisierte Feldtypen und sprechende Titles/column names je Tabelle.
   - Begründung: Reduziert kognitive Last in der NocoDB-Oberfläche und vermeidet Mapping-Fehler.
   - Alternative: Beibehaltung technisch geprägter interner Feldnamen. Verworfen wegen schlechter UI-Nutzbarkeit.

2. **Relationsfelder statt rein numerischer Fremdschlüssel bevorzugen, wo sinnvoll**
   - Entscheidung: Verknüpfungen zwischen Users/Roles/Permissions über NocoDB-kompatible Relation- bzw. Link-Felder vorsehen, sofern stabil und kompatibel.
   - Begründung: Bessere Bedienbarkeit in der UI und geringere manuelle Fehlerquote.
   - Alternative: Nur Number-Felder für IDs. Verworfen wegen eingeschränkter Editor-Ergonomie.

3. **Idempotente Schema-Provisionierung als Pflicht**
   - Entscheidung: Startup ergänzt fehlende Tabellen/Felder deterministisch, ohne Dubletten zu erzeugen.
   - Begründung: Sichere Deployments und Wiederanläufe.
   - Alternative: Manuelle Einmal-Setup-Skripte. Verworfen wegen Betriebsrisiko.

4. **Kompatibilitätslayer für bestehende Logik während Umstellung**
   - Entscheidung: Service-Zugriffe werden auf definierte Standardfeldnamen konsolidiert; Übergangsweise Mappings sind zulässig, bis Migration abgeschlossen ist.
   - Begründung: Senkt Ausfallrisiko in bestehenden Umgebungen.
   - Alternative: Hartes Breaking Schema ohne Übergang. Verworfen wegen hoher Migrationsgefahr.

5. **Schemaänderungen durch Tests absichern**
   - Entscheidung: Tests prüfen Feldexistenz, Typkonsistenz und korrekte Les-/Schreiboperationen über bestehende Services.
   - Begründung: Frühzeitiges Erkennen von Drift oder API-Inkompatibilitäten.
   - Alternative: Nur manuelle Prüfung in der UI. Verworfen wegen regressionsanfälligem Prozess.

## Risks / Trade-offs

- **[Schema-Migration bricht bestehende Feldauswertungen]** → Mitigation: Übergangs-Mapping und Regressionstests auf Kernflüsse.
- **[Relation-Felder verhalten sich je NocoDB-Version unterschiedlich]** → Mitigation: Versionierte Integrationschecks und Fallback auf stabile Feldformen.
- **[Idempotenzfehler erzeugen inkonsistente Tabellenzustände]** → Mitigation: Schrittweise Existenzprüfungen pro Tabelle/Feld und klare Fehlerlogs.
- **[Mehr UI-Freundlichkeit erhöht Modellkomplexität]** → Mitigation: Präzise Feldkonventionen und Dokumentation.

## Migration Plan

1. Zielschema mit Standardfeldern pro Systemtabelle definieren.
2. Initialisierung erweitern, um fehlende Felder/Tabellen idempotent anzulegen.
3. Servicezugriffe auf neue Feldkonventionen ausrichten und Kompatibilitätsmapping ergänzen.
4. Bestehende Daten auf neue/angepasste Felder migrieren oder synchronisieren.
5. Tests und Staging-Validierung durchführen, danach kontrollierter Rollout.

## Open Questions

- Soll bei vorhandenen numerischen FK-Feldern sofort auf Relation-Felder migriert werden oder in zwei Schritten?
- Welche Feldnamen sind final verbindlich (column_name vs. title) für langfristige API-Stabilität?
- Welche Mindestmenge an Audit-/Metafeldern soll in allen Systemtabellen verpflichtend sein?