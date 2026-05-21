## Context

Die Middleware basiert auf NestJS und verwendet NocoDB als persistente Daten- und Metadatenplattform. Der aktuelle Stand zeigt bereits Services für Data-Operationen und Initialisierung, aber die Anforderungen für den konsequenten Einsatz der V3 Meta- und Data-API, robuste Betriebsmechanismen und klar testbare RBAC-Flows sind noch nicht als technische Leitplanken festgelegt.

Technische Randbedingungen:
- NocoDB wird über Token-basierte API-Zugriffe angebunden.
- V3 Data API wird für CRUD-Workloads benötigt.
- V3 Meta API soll als primärer Pfad für Schema-Operationen gelten; Übergangsstrategien für V2-Fallbacks müssen klar geregelt sein.
- Middleware muss in produktionsähnlichen Umgebungen mit Logging, Fehlerklassifikation, Caching und Rate-Limiting stabil laufen.

## Goals / Non-Goals

**Goals:**
- Einheitliche Service-Grenzen für NocoDB V3 Data und Meta API definieren.
- Deterministische Initialisierung/Seed-Logik mit idempotentem Verhalten sicherstellen.
- RBAC-Prüfungen für tabellenbezogene CRUD-Aktionen verbindlich in Guards integrieren.
- Operability-Standards (Fehlerbehandlung, Logging, Caching, Rate-Limiting) als verpflichtende Anforderungen abbilden.
- Testbarkeit durch klare Szenarien für Initialisierung, Berechtigungsprüfung und CRUD-Fehlerfälle sicherstellen.

**Non-Goals:**
- Kein Ersatz des Auth-Systems durch einen externen IAM-Provider.
- Keine UI-/Frontend-Funktionalität.
- Keine Mandantenfähigkeit über mehrere NocoDB-Bases in diesem Change.
- Keine vollständige Eliminierung aller V2-Endpunkte in einem Big-Bang ohne Migrationsabsicherung.

## Decisions

1. **API-Schichtung in der Middleware trennen (Data vs. Meta).**
   - Entscheidung: Data- und Meta-Operationen bleiben in separaten Service-Pfaden mit klaren Verantwortlichkeiten.
   - Begründung: Reduziert Kopplung, vereinfacht Tests und erlaubt gezielte Retry-/Fallback-Strategien je API-Typ.
   - Alternative: Ein monolithischer „NocoDBGatewayService“ für alles. Verworfen wegen höherer Komplexität und schlechterer Fehlereingrenzung.

2. **Idempotente Initialisierung als Standard.**
   - Entscheidung: Tabellen/Spalten/Seeds werden nur erstellt, wenn sie nicht vorhanden sind; wiederholte Starts dürfen keine inkonsistenten Dubletten erzeugen.
   - Begründung: Stabilere Deployments und sichere Neustarts.
   - Alternative: Einmalige, manuelle Initialisierung. Verworfen wegen höherem Betriebsrisiko.

3. **RBAC zentral über Guard + Permissions-Service erzwingen.**
   - Entscheidung: Controller-Aktionen annotieren erforderliche Berechtigungen; Guard delegiert die Prüfung an Permissions-Service.
   - Begründung: Konsistente Durchsetzung, bessere Auditierbarkeit.
   - Alternative: Berechtigungsprüfungen direkt in jedem Controller/Service. Verworfen wegen duplizierter Logik.

4. **Operability als first-class Concern.**
   - Entscheidung: Klassifizierte Fehler, strukturierte Logs, Cache für leselastige Pfade und Rate-Limiting in NocoDB-nahen Aufrufen.
   - Begründung: Schutz vor API-Überlastung und bessere Diagnose in Produktion.
   - Alternative: Nur Basis-Logging ohne Cache/Limitierung. Verworfen wegen Instabilitätsrisiko unter Last.

5. **Schrittweise V3-Ausrichtung mit kontrollierten Übergängen.**
   - Entscheidung: V3 ist Zielzustand; wo zwingend nötig sind temporäre V2-Kompatibilitätsbrücken explizit markiert und testbar.
   - Begründung: Minimiert Migrationsrisiken bei laufendem Betrieb.
   - Alternative: Sofortige, vollständige V3-Umstellung ohne Fallback. Verworfen wegen hohem Ausfallrisiko.

## Risks / Trade-offs

- **[NocoDB API-Verhaltensänderungen zwischen Versionen]** → Mitigation: Vertragsnahe Integrationstests gegen V3-Endpunkte und klarer Fallback-Pfad für kritische Meta-Operationen.
- **[Inkonsistente Initialisierungszustände bei teilweisen Fehlern]** → Mitigation: Idempotente Checks pro Schritt, strukturierte Fehlerausgabe und sichere Wiederanlaufbarkeit.
- **[RBAC-Fehlkonfiguration sperrt legitime Requests]** → Mitigation: Default-Deny mit expliziten Seed-Berechtigungen, Guard-Tests für erlaubte/verbotene Pfade.
- **[Rate-Limiting reduziert Durchsatz in Peaks]** → Mitigation: Konfigurierbare Grenzwerte, Monitoring der Latenz und Cache-Nutzung für Read-Last.
- **[Übergangsweise V2-Fallbacks verlängern technische Schulden]** → Mitigation: Fallbacks dokumentieren, mit Exit-Kriterien versehen und in Folgeschritt entfernen.

## Migration Plan

1. Bestehende NocoDB-Integrationspfade inventarisieren und auf Data-/Meta-Verantwortung abbilden.
2. V3-konforme Spezifikationen für Data-Zugriffe, Meta-Initialisierung, RBAC und Operability einführen.
3. Implementierung schrittweise je Capability, jeweils mit Unit-/Integrationstests absichern.
4. V2-Fallback-Pfade auf minimales Set reduzieren und als Übergang markieren.
5. Rollout in Staging mit Last- und Berechtigungstests; bei Fehlern Rollback auf vorherigen Middleware-Stand über Deployment-Artefakte.

## Open Questions

- Welche NocoDB V3 Meta-Operationen sind in der Zielversion vollständig stabil genug ohne V2-Bridge?
- Welche Cache-TTLs sind pro Endpunktklasse sinnvoll (Permissions vs. Stammdaten vs. volatile Daten)?
- Sollen Seed-Credentials nur initial erzeugt oder auch regelmäßig rotiert/erzwingbar erneuert werden?
- Welche Mindest-Metriken (Error-Rate, P95-Latenz, Retry-Rate) gelten als Go-Live-Gate?