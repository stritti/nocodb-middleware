## 1. Security Baseline für Token-Proxy

- [ ] 1.1 Alle NocoDB-Zugriffspfade auf potenzielle Token-Exposure in Responses, Fehlern und Logs prüfen
- [ ] 1.2 Einheitliche Secret-Redaction/Sanitization für Fehler- und Loggingpfade implementieren
- [ ] 1.3 Sicherstellen, dass kein Endpoint tokenbezogene Konfigurationswerte nach außen liefert
- [ ] 1.4 Security-Tests ergänzen, die Token-Leakage in Payload, Headern und Logs verhindern

## 2. Proxy-Only Zugriffsmuster durchsetzen

- [ ] 2.1 Middleware-Endpunkte als einzigen unterstützten Zugangspfad für NocoDB-Daten dokumentieren und absichern
- [ ] 2.2 Interne NocoDB-HTTP-Clients auf serverseitige Secret-Nutzung begrenzen
- [ ] 2.3 Fehlerverhalten für unzulässige tokenbezogene Zugriffsversuche definieren und testen

## 3. Konfigurierbares CORS implementieren

- [ ] 3.1 CORS-Konfiguration (Origins, Methods, Headers, Credentials) in den Config-Layer aufnehmen
- [ ] 3.2 CORS-Setup in `src/main.ts` strikt auf konfigurierte Allowlist umstellen
- [ ] 3.3 Sichere Defaults für fehlende/ungültige CORS-Konfiguration implementieren
- [ ] 3.4 Tests für erlaubte und blockierte Origins sowie Credentials-Header ergänzen

## 4. Validierung und Betriebsreife

- [ ] 4.1 Unit- und Integrations-Tests für Security- und CORS-Anforderungen vollständig ausführen
- [ ] 4.2 Laufzeitlogs auf korrelierbare, nicht-sensitive Fehlermeldungen prüfen
- [ ] 4.3 Konfigurationsdokumentation für Umgebungen (dev/staging/prod) in `docs/` aktualisieren
- [ ] 4.4 Rollout- und Rollback-Hinweise für Security-/CORS-Änderungen festhalten