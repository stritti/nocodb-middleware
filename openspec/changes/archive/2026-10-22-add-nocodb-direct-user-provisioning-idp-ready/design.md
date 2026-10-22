## Context

Aktuell liegt der Schwerpunkt auf lokaler JWT-basierter Authentifizierung. Fuer die naechsten Schritte wird ein direkter Benutzer-Provisioning-Mechanismus in NocoDB benoetigt, der gleichzeitig OAuth/JWT-konforme Tokenverarbeitung sicherstellt und spaeter durch einen externen IdP ersetzt werden kann.

Randbedingungen:

- Lokales Provisioning muss als stabiler Default ohne externen IdP funktionieren.
- JWT-Claims muessen fuer lokale und externe Identitaeten einheitlich ausgewertet werden.
- OAuth-konformes Verhalten darf nicht durch provider-spezifische Sonderlogik im Controller gebrochen werden.
- Ein Wechsel des Identity Providers soll ueber Konfiguration moeglich sein.

## Goals / Non-Goals

**Goals:**

- Benutzeranlage, -update und -deaktivierung direkt in NocoDB bereitstellen.
- Provider-Abstraktion einfuehren, die lokale und externe IdP-Identitaeten gleich behandelt.
- JWT/OAuth-konforme Claim- und Scope-Normalisierung zentralisieren.
- Guard-/Permission-Flows fuer lokal und extern authentifizierte Benutzer vereinheitlichen.
- Ausfuehrbare Tests fuer lokale Provisioning-Flows und optionalen IdP-Swap bereitstellen.

**Non-Goals:**

- Kein vollstaendiger Betrieb eines externen OAuth Authorization Servers in diesem Change.
- Kein UI-Frontend fuer Benutzerverwaltung.
- Keine Migration historischer Benutzerdaten aus Dritt-Systemen.

## Decisions

1. **IdentityProvider-Port als zentrale Abstraktion**
   - Entscheidung: Ein `IdentityProviderPort` kapselt User-Lookup, User-Provisioning und Claim-Mapping.
   - Begruendung: Lokaler Provider und externer IdP bleiben austauschbar ohne Controller-Umbauten.
   - Alternative: Direkte if/else-Logik pro Provider in AuthService. Verworfen wegen hoher Kopplung.

2. **Lokaler NocoDB-Provider als Default-Implementierung**
   - Entscheidung: Standard bleibt ein lokaler Provider, der Benutzer in NocoDB-Tabellen verwaltet.
   - Begruendung: Sofort nutzbar ohne externe Infrastruktur, kompatibel mit bestehendem Setup.
   - Alternative: Externer IdP als Pflicht. Verworfen wegen Betriebsaufwand und Abhaengigkeit.

3. **Zentrale Claim-Normalisierung fuer JWT/OAuth**
   - Entscheidung: Claims (`sub`, `email`, `roles`, optionale `scope`) werden in einem Mapping-Service normalisiert.
   - Begruendung: Konsistente Autorisierung unabhaengig von Token-Herkunft.
   - Alternative: Ad-hoc-Mapping in Guards. Verworfen wegen Inkonsistenzrisiko.

4. **Provisioning-Hooks im Auth-Flow**
   - Entscheidung: Nach erfolgreicher Tokenvalidierung wird der Benutzer ueber Provider-Port auf Upsert-Basis synchronisiert.
   - Begruendung: Sicherstellt, dass User-State in NocoDB mit Authentitaet konsistent bleibt.
   - Alternative: Manuelle Benutzeranlage vorab erzwingen. Verworfen wegen schlechter UX und hohem Aufwand.

5. **Konfigurierbarer IdP-Switch mit sicheren Defaults**
   - Entscheidung: `AUTH_PROVIDER=local|external` mit Validierung; bei `external` muessen IdP-Parameter gesetzt sein.
   - Begruendung: Klarer, auditable Umschaltpunkt ohne verdeckte Runtime-Fallbacks.
   - Alternative: Automatisches Mischverhalten. Verworfen wegen schwer vorhersehbarer Auth-Pfade.

## Risks / Trade-offs

- **[Fehlkonfiguration des externen IdP blockiert Login]** -> Mitigation: Config-Validation beim Start und eindeutige Fehler.
- **[Claim-Drift zwischen Providern fuehrt zu Rechtefehlern]** -> Mitigation: Gemeinsame Claim-Schema-Tests.
- **[Upsert-Provisioning kann ungewollte User-Aktivierung ausloesen]** -> Mitigation: Explizite Aktivierungsregeln und deny-by-default.
- **[Mehr Abstraktion erhoeht Komplexitaet]** -> Mitigation: Klare Interfaces, modulare Provider-Implementierungen, Unit-Tests.

## Migration Plan

1. Provider-Port und lokale NocoDB-Implementierung in Auth/Users integrieren.
2. Claim-Normalisierung und Token-Validierung fuer JWT/OAuth konsolidieren.
3. Provisioning-Upsert im Login-Flow hinter Feature-Flag bzw. Provider-Konfiguration aktivieren.
4. Optionale externe Provider-Implementierung anschliessen (zunaechst minimaler Read/Validate-Pfad).
5. Regressionstests fuer lokale Flows und Konfigurationswechsel (`local` <-> `external`) ausfuehren.

## Open Questions

- Welche minimalen Claims sind fuer die externe IdP-Integration verbindlich (`sub`, `email`, `roles`)?
- Sollen externe Gruppenclaims direkt auf interne Rollen gemappt werden oder ueber eine Mapping-Tabelle?
- Muss bei Provider-Wechsel eine Session-/Refresh-Token-Invalidierung erzwungen werden?
