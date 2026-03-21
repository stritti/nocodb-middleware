## Why

Es wird eine produktionsfähige NestJS-Middleware benötigt, die NocoDB als Datenplattform über die aktuelle V3 Meta- und Data-API anbinden kann. Bisher fehlt ein klarer, spezifizierter Rahmen für Initialisierung, CRUD, RBAC und Betriebsaspekte auf Basis der V3-Endpunkte.

## What Changes

- Einführung einer Middleware-Architektur in NestJS, die NocoDB V3 Data API für CRUD-Operationen kapselt.
- Einführung einer Meta-Initialisierungsschicht, die Tabellen/Spalten über NocoDB V3 Meta API verwaltet.
- Definition eines RBAC-Flows (Rollen, Tabellenrechte, Guard-Integration) auf Middleware-Ebene.
- Definition von Fehlerbehandlung, Caching, Logging und Rate-Limiting für stabile API-Nutzung.
- Definition von Integrations- und Servicetests für kritische Pfade (Initialisierung, Berechtigungen, CRUD).

## Capabilities

### New Capabilities
- `nocodb-v3-data-access`: Einheitliche, getestete Nutzung der NocoDB V3 Data API für Lesen/Schreiben/Filtern.
- `nocodb-v3-meta-initialization`: Deterministische Initialisierung und Pflege von Tabellenstrukturen über NocoDB V3 Meta API.
- `middleware-rbac-enforcement`: Rollen- und Tabellenberechtigungen mit Guards und Permissions-Service.
- `middleware-operability-controls`: Fehlerbehandlung, Logging, Caching und Rate-Limiting für robuste Laufzeit.
- `v3-table-catalog-exposure`: Optionale, transparente API zur Auflistung existierender NocoDB-Tabellen (mit Name↔ID-Mapping) unter Ausschluss interner Middleware-Systemtabellen.

### Modified Capabilities
- Keine.

## Impact

- Betroffene Bereiche: `src/nocodb/*`, `src/permissions/*`, `src/auth/*`, `src/app.module.ts` sowie zugehörige Specs.
- Externe APIs: NocoDB V3 Meta (`/api/v3/meta`) und NocoDB V3 Data (`/api/v3/data`).
- Testauswirkung: Erweiterung/Anpassung von Unit- und Integrations-Tests für NocoDB- und RBAC-Flows.
- Betriebsauswirkung: Klare Anforderungen an Konfiguration (Base-ID, Token, API-URL) und Laufzeitresilienz.