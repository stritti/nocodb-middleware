## Context

Die Middleware dient als Backend-Proxy zwischen Frontend und NocoDB. Derzeit besteht das Risiko, dass Clients versucht sein könnten, direkt mit NocoDB zu sprechen oder Token-Informationen über Response-/Fehlerpfade indirekt sichtbar werden. Gleichzeitig fehlt eine verbindliche, umgebungsabhängige CORS-Policy, um Zugriffe auf erlaubte Origins zu beschränken.

Relevante Randbedingungen:
- NocoDB API-Token ist ein hochsensibles Secret und darf nur serverseitig verwendet werden.
- Frontend-Clients sollen ausschließlich über Middleware-Endpunkte auf Daten zugreifen.
- CORS muss je Umgebung (dev/staging/prod) konfigurierbar sein.
- Fehlkonfigurationen müssen früh sichtbar sein und sichere Defaults erzwingen.

## Goals / Non-Goals

**Goals:**
- Sicherstellen, dass NocoDB-Tokens nicht an Frontend oder Drittsysteme geleakt werden.
- Ein explizites Proxy-Modell etablieren: nur Middleware spricht mit NocoDB.
- Konfigurierbares CORS mit klaren Regeln für Origins, Methods, Headers und Credentials bereitstellen.
- Security-bezogene Fehlerfälle (Origin blockiert, fehlende CORS-Konfiguration) deterministisch behandeln.
- Tests für Token-Abschirmung und CORS-Durchsetzung definieren.

**Non-Goals:**
- Kein vollständiges API-Gateway-Produkt mit WAF/Edge-Funktionen.
- Keine Browser-Client-Auth-Neugestaltung außerhalb der bestehenden Middleware-Auth.
- Keine dynamische CORS-Policy-Verwaltung über Admin-UI in diesem Change.

## Decisions

1. **Strict Server-Side Token Handling**
   - Entscheidung: NocoDB-Token wird ausschließlich aus Server-Konfiguration geladen und nur in ausgehenden Middleware→NocoDB Requests verwendet.
   - Begründung: Minimiert Exfiltrationsfläche und erfüllt Security-by-Design.
   - Alternative: Token in Frontend für direkte NocoDB-Nutzung. Verworfen wegen hohem Leak-Risiko.

2. **Proxy-Only Access Pattern**
   - Entscheidung: Frontend konsumiert nur Middleware-Endpunkte; direkte Token-Weitergabe oder Token-Echo in Responses wird ausgeschlossen.
   - Begründung: Klare Trust-Boundary, zentralisierte Kontrolle (RBAC, Logging, Rate-Limit).
   - Alternative: Hybrid mit optionalen direkten Frontend-Calls. Verworfen wegen Kontrollverlust.

3. **Config-Driven CORS Policy**
   - Entscheidung: CORS-Regeln werden über Konfiguration gesetzt (Whitelist-Origin(s), erlaubte Methods/Headers, Credentials-Flag), mit sicheren Defaults.
   - Begründung: Flexible Nutzung pro Umgebung bei konsistentem Schutz.
   - Alternative: Hartkodierte CORS-Regeln. Verworfen wegen schlechter Wartbarkeit.

4. **Fail-Safe Security Defaults**
   - Entscheidung: Bei kritischer CORS-Fehlkonfiguration oder ungültigen Origin-Listen werden restriktive Defaults angewendet und Warnungen/Fehler geloggt.
   - Begründung: Verhindert ungewolltes Open-CORS in Produktion.
   - Alternative: Soft-Fail zu permissivem CORS. Verworfen wegen Sicherheitsrisiko.

5. **Security-Focused Test Coverage**
   - Entscheidung: Tests prüfen explizit, dass Responses keine Secrets enthalten und unzulässige Origins blockiert werden.
   - Begründung: Verifizierbare Schutzwirkung statt impliziter Annahmen.
   - Alternative: Nur manuelle Tests. Verworfen wegen regressionsanfälligem Verhalten.

## Risks / Trade-offs

- **[Zu restriktive CORS-Konfiguration blockiert legitime Clients]** → Mitigation: Klare Umgebungs-Defaults, Validierung und Staging-Verifikation.
- **[Fehlende Trennung in Fehlerobjekten könnte Secret-Metadaten leaken]** → Mitigation: Einheitliche Fehler-Sanitization und Redaction-Policy.
- **[Proxy-only erhöht Last auf Middleware]** → Mitigation: Caching/Rate-Limiting und horizontale Skalierung.
- **[Mehr Konfigurationsparameter erhöhen Betriebsaufwand]** → Mitigation: Dokumentierte Konfigurationsmatrix und sichere Standardwerte.

## Migration Plan

1. Bestehende NocoDB-Aufrufpfade auf potenzielle Token-Exposure prüfen.
2. Proxy-Policy festziehen und Secret-Sanitization im Fehler-/Loggingpfad absichern.
3. CORS-Konfigurationsparameter einführen und in `main.ts` verbindlich anwenden.
4. Tests für Origin-Allow/Block, Credential-Verhalten und Secret-Redaction ergänzen.
5. Rollout über Staging; bei Sicherheits- oder Kompatibilitätsproblemen Rollback auf vorheriges Deployment.

## Open Questions

- Soll CORS pro Route-Gruppe differenziert oder global auf Anwendungsebene gelten?
- Welche Allowlist-Strategie wird in Multi-Frontend-Szenarien bevorzugt (statisch vs. env-generiert)?
- Werden zusätzliche Security-Header (z. B. CSP-Varianten) in demselben Change mit aufgenommen?