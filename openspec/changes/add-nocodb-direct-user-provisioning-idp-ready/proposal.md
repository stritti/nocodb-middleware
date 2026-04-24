## Why

Die Middleware soll Benutzer direkt in NocoDB anlegen und verwalten koennen, ohne auf ein externes IAM angewiesen zu sein. Gleichzeitig muss das Auth-Modell JWT- und OAuth-konform bleiben, damit spaeter ein externer Identity Provider (IdP) ohne Architekturbruch optional aktiviert werden kann.

## What Changes

- Einfuehrung eines Provisioning-Flows, der Benutzerkonten direkt in NocoDB erstellt, aktualisiert und deaktiviert.
- Harmonisierung der Auth-Schnittstellen fuer lokale Accounts und OAuth/JWT-Token, inklusive konsistenter Claims/Scopes.
- Abstraktionsschicht fuer Identity Provider, damit lokales Provisioning und externer IdP austauschbar konfiguriert werden koennen.
- Erweiterung von Rollen-/Rechtepruefungen fuer neu provisionierte Benutzer.
- Testabdeckung fuer JWT-Claims, OAuth-Flow-Kompatibilitaet und IdP-Swap-Szenarien.

## Capabilities

### New Capabilities

- `nocodb-user-provisioning`: Erstellt und verwaltet Benutzer direkt in NocoDB inklusive Aktivierungsstatus.
- `pluggable-identity-provider`: Kapselt Identitaetsquelle hinter einer einheitlichen Provider-Schnittstelle.

### Modified Capabilities

- `jwt-token-issuance`: Vereinheitlicht Token-Claims fuer lokale und externe Identitaetsquellen.
- `oauth-compatibility`: Erweitert OAuth-konforme Validierung und Mapping von User-Identitaeten.

## Impact

- Betroffene Bereiche: `src/auth/*`, `src/users/*`, `src/permissions/*`, `src/nocodb/*` sowie Konfiguration und Tests.
- Sicherheit: Striktere Claims-/Scope-Validierung und klar getrennte Verantwortlichkeiten zwischen Provisioning und Auth.
- Betrieb: Neue ENV-Parameter fuer Provider-Auswahl (lokal vs. extern) und optionale IdP-Konfiguration.
- Migration: Bestehende lokale JWT-Flows bleiben Default; IdP-Integration wird optional zuschaltbar umgesetzt.
