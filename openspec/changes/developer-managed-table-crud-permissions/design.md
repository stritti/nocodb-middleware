## Context

Die Middleware enthält bereits Grundlagen für Rollen und Berechtigungen, jedoch fehlt ein standardisierter, entwicklergesteuerter Prozess zur Vergabe von CRUD-Rechten auf projektspezifische NocoDB-Tabellen. Gleichzeitig müssen diese Rechte persistent im NocoDB-Schema abgelegt werden, damit Berechtigungsentscheidungen über Neustarts und Deployments konsistent bleiben.

Randbedingungen:
- Rechte müssen an bestehende Benutzer-/Rollenmodelle gekoppelt sein.
- Persistenz in NocoDB muss idempotent und migrationssicher erfolgen.
- Laufzeit-Enforcement muss auf den tatsächlich gespeicherten Rechten basieren.
- Entwickler brauchen APIs/Services zur Pflege der Rechte ohne manuelle Tabellenmanipulation.

## Goals / Non-Goals

**Goals:**
- CRUD-Rechte pro NocoDB-Tabelle für Benutzer/Rollen zentral verwaltbar machen.
- Tabellenrechte im NocoDB-Schema persistieren und beim Start konsistent verfügbar halten.
- Permission-Checks zur Request-Zeit ausschließlich auf persistierte Rechte stützen.
- APIs für Setzen, Aktualisieren und Lesen von Tabellenrechten bereitstellen.
- Testbare End-to-End-Flows für Vergabe → Persistenz → Enforcement schaffen.

**Non-Goals:**
- Kein vollständiges ABAC- oder Policy-Engine-System.
- Keine UI zur Rechteverwaltung im selben Change.
- Keine dynamische Rechteableitung aus externen IAM-Systemen.
- Keine feldbasierte (column-level) Berechtigung in dieser Iteration.

## Decisions

1. **Role-first Permission Assignment mit optionaler User-Übersteuerung**
   - Entscheidung: Primär werden Rechte rollenbasiert gepflegt; optionale user-spezifische Regeln können ergänzt werden.
   - Begründung: Gute Balance aus Einfachheit und Flexibilität.
   - Alternative: Nur userbasierte Rechte. Verworfen wegen hohem Verwaltungsaufwand.

2. **Persistenz als NocoDB-native Permission-Tabellenstruktur**
   - Entscheidung: CRUD-Rechte werden als strukturierte Records im NocoDB-Schema gespeichert (z. B. table_permissions inkl. table_name + can_* Felder).
   - Begründung: Konsistente Datenhaltung am selben Ort wie die übrigen Middleware-Daten.
   - Alternative: In-Memory oder Datei-basiert. Verworfen wegen fehlender Persistenz/Auditierbarkeit.

3. **Deterministisches Runtime-Enforcement über Permissions-Service**
   - Entscheidung: Guard delegiert an Permissions-Service, der Rechte aus persistierten NocoDB-Daten auflöst.
   - Begründung: Einheitliche Autorisierungslogik und zentrale Erweiterbarkeit.
   - Alternative: Verteilte Controller-Checks. Verworfen wegen Inkonsistenzrisiko.

4. **Idempotente Schema-Initialisierung für Permission-Strukturen**
   - Entscheidung: Startinitialisierung erstellt fehlende Permission-Strukturen nur bei Bedarf.
   - Begründung: Verhindert Dubletten und unterstützt sichere Wiederanläufe.
   - Alternative: Manuelle Vorbereitungs-Skripte. Verworfen wegen operativer Fehleranfälligkeit.

5. **Developer-facing Management APIs mit strikter Zugriffskontrolle**
   - Entscheidung: Nur berechtigte Entwickler-/Admin-Rollen dürfen Tabellenrechte verändern.
   - Begründung: Schutz vor unkontrollierter Rechteeskalation.
   - Alternative: Offene API für alle authentifizierten Nutzer. Verworfen wegen Sicherheitsrisiko.

## Risks / Trade-offs

- **[Fehlkonfigurierte Rechte können legitime Zugriffe blockieren]** → Mitigation: Validierungsregeln, dry-run-fähige Tests und klare Fehlermeldungen.
- **[Zu großzügige Rechtevergabe erhöht Sicherheitsrisiko]** → Mitigation: Default-Deny, Admin-only Mutations, Auditierbares Logging.
- **[Schema-Drift zwischen Umgebungen]** → Mitigation: Idempotente Initialisierung und Integrationsprüfungen beim Startup.
- **[Mehr Persistenzabfragen erhöhen Latenz]** → Mitigation: Selektives Caching und invalidierungsbasierte Aktualisierung bei Rechtemutationen.

## Migration Plan

1. Bestehende Permission-Modelle und Tabellen auf Zielstruktur abgleichen.
2. Fehlende NocoDB-Tabellen/Felder für CRUD-Berechtigungen idempotent ergänzen.
3. Management-Endpunkte für Lesen/Schreiben von Tabellenrechten einführen.
4. Runtime-Guard auf persistierte Rechteauflösung umstellen.
5. Testsuite für Vergabe, Persistenz und Enforcement ausführen und Staging validieren.

## Open Questions

- Soll es neben Rollenrechten in dieser Iteration bereits explizite User-Overrides geben?
- Welche Konfliktregel gilt bei widersprüchlichen Rechten (z. B. allow in Rolle A, deny in Rolle B)?
- Welche Auditfelder sind minimal erforderlich (actor, timestamp, before/after)?