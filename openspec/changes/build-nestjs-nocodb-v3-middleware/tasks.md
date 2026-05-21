## 1. V3 Data API Foundation

- [x] 1.1 Service-Contract für Create/Read/Update/Delete in `src/nocodb/nocodb-v3.service.ts` auf normiertes Antwortformat festziehen
- [x] 1.2 Filter-, Sortier- und Pagination-Parameter-End-to-End validieren und durchreichen
- [x] 1.3 Fehlerklassifikation für V3-Data-Fehler (Validation/Auth/NotFound/RateLimit/Upstream) zentralisieren
- [x] 1.4 Unit-Tests für CRUD-, Listen- und Fehlerpfade in `src/nocodb/nocodb-v3.service.spec.ts` erweitern
- [x] 1.5 Optionalen Tabellenkatalog-Endpunkt (Name↔ID) auf Basis der V3-Meta-Tabellenliste mit Exclude interner Systemtabellen definieren und umsetzen

## 2. V3 Meta Initialization Hardening

- [ ] 2.1 Idempotente Tabelleninitialisierung in `src/nocodb/database-initialization.service.ts` gegen bestehende Meta-Zustände absichern
- [ ] 2.2 Deterministische Spalten-Synchronisation (fehlende Spalten ergänzen, kompatible Spalten erhalten) implementieren
- [ ] 2.3 Wiederanlaufbare Fehlerbehandlung für partielle Initialisierungsfehler inklusive strukturierter Logs ergänzen
- [x] 2.4 Integrationsnahe Tests für Mehrfachstart- und Recoveryszenarien in `src/nocodb/database-initialization.service.spec.ts` ergänzen

## 3. RBAC Enforcement

- [ ] 3.1 Permissions-Decorator/Guard-Verkettung für tabellenbezogene CRUD-Aktionen in Controllern verankern
- [ ] 3.2 Rollenaggregation im Permissions-Service für Mehrfachrollen deterministisch umsetzen
- [ ] 3.3 Auditierbares Logging bei abgelehnten Berechtigungsentscheidungen (userId/action/table) ergänzen
- [ ] 3.4 Guard- und Service-Tests für erlaubte/verbotene Pfade in `src/permissions/*.spec.ts` ausbauen

## 4. Operability Controls

- [ ] 4.1 Konfigurierbares Rate-Limiting für ausgehende NocoDB-Aufrufe zentral umsetzen
- [ ] 4.2 Cache-Strategie mit TTL für leselastige Pfade in `src/nocodb/cache/*` auf spezifizierte Endpunkte anwenden
- [x] 4.3 Einheitliche Fehlerstruktur und korrelierbare Logging-Felder über NocoDB-nahe Pfade harmonisieren
- [x] 4.5 Request-Context-Middleware (`x-request-id`, Benutzerkontext-Header) auf konsistente Downstream-Nutzung und Logging-Korrelation prüfen
- [ ] 4.4 Last-/Fehlerszenarien (Burst, Timeout, Retry) mit zielgerichteten Tests absichern

## 5. Integration, Validation und Rollout

- [ ] 5.1 Konfiguration (`nocodb.apiUrl`, `nocodb.apiToken`, `nocodb.baseId`, Rate-Limits, Cache-TTL) für alle Umgebungen prüfen
- [ ] 5.2 V2-Übergangspfade explizit markieren und minimale Fallback-Nutzung dokumentieren
- [x] 5.3 Relevante Unit-/Integrations-Testsuite vollständig ausführen und regressionsfrei bestätigen
- [ ] 5.4 Betriebsrelevante Doku in `docs/` zu V3 Meta/Data, RBAC und Operability aktualisieren
- [ ] 5.5 API-Transparenz sicherstellen: Middleware-Endpunkte auf V3-nahe Semantik prüfen und proprietäre Abweichungen dokumentieren