## 1. Provider-Abstraktion und Konfiguration

- [x] 1.1 `IdentityProviderPort` Interface fuer Lookup, Provisioning und Claim-Mapping definieren
- [x] 1.2 Konfigurationsmodell fuer `AUTH_PROVIDER=local|external` inkl. Startup-Validierung implementieren
- [x] 1.3 Provider-Factory/DI-Bindings in `AuthModule` ergaenzen

## 2. Lokales NocoDB-User-Provisioning

- [x] 2.1 Service-Logik fuer direkten User-Upsert in NocoDB (create/update/deactivate) implementieren
- [x] 2.2 Eindeutige Schluessel (z. B. `sub`/`email`) und Konfliktstrategie fuer Provisioning festlegen
- [x] 2.3 Sensible Felder aus API-Responses und Logs ausschliessen
- [x] 2.4 Unit-Tests fuer lokale Provisioning-Pfade und Fehlerfaelle ergaenzen

## 3. JWT- und OAuth-Konformitaet absichern

- [x] 3.1 Zentralen Claim-Normalizer fuer lokale und externe Token einbauen
- [x] 3.2 Scope-/Roles-Mapping auf bestehende Permission-Checks abstimmen
- [x] 3.3 Guards/Strategien so erweitern, dass sie provider-unabhaengig mit normalisierten Claims arbeiten
- [x] 3.4 Tests fuer gueltige/ungueltige Claims, abgelaufene Token und Rollenauflosung ausbauen

## 4. Optionalen externen IdP anschlussfaehig machen

- [x] 4.1 Minimale externe Provider-Implementierung (Token validieren + User lesen) anlegen
- [x] 4.2 Konfigurationsgetriebener Switch zwischen lokalem Provider und externem Provider implementieren
- [x] 4.3 Fallback-Verhalten fuer fehlerhafte externe Konfiguration klar definieren (fail closed)
- [x] 4.4 Integrationstests fuer Provider-Switch (`local` <-> `external`) erstellen

## 5. Qualitaet, Dokumentation und Rollout

- [x] 5.1 Relevante Unit-/Integrationstests fuer Auth, Users, Permissions und NocoDB-Adapter ausfuehren
- [x] 5.2 ENV-Dokumentation fuer lokalen/externalen Provider und benoetigte Secrets in `docs/` aktualisieren
- [x] 5.3 Betriebsleitfaden fuer IdP-Wechsel inkl. Risiko- und Rollback-Hinweise ergaenzen
- [x] 5.4 Security-Review auf Claim-Vertrauen, Rechteeskalation und Logging-Sensitivitaet durchfuehren
