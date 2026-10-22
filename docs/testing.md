# Testing Documentation

## Test Commands

```bash
# Unit tests
npm test

# Unit tests (watch)
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov

# Integration tests against a real NocoDB (see below)
npm run test:integration

# Run only the auth E2E test
npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts
```

## Test Coverage

### Unit Tests (`*.spec.ts`)

Der Testbestand deckt primär ab:

- NocoDB-Service-Schicht (`src/nocodb/*.spec.ts`)
- Cache-Service (`src/nocodb/cache/*.spec.ts`)
- Permissions/RBAC-Services (`src/permissions/*.spec.ts`)
- Rollen-/User-Rollen-Services (`src/roles/*.spec.ts`, `src/users/*.spec.ts`)
- JWT Strategy (`src/auth/strategies/*.spec.ts`)
- Basis-App (`src/app.controller.spec.ts`)

### E2E Tests (`test/*.e2e-spec.ts`)

- `test/app.e2e-spec.ts` — Basis-Smoke-Test (Hello World, 401 ohne Auth, Validation)
- `test/auth.e2e-spec.ts` — Auth Flow Tests:
  - Öffentliche Endpunkte (Health, Root)
  - Unautorisierter Zugriff (401 ohne Token)
  - Bootstrap-Admin-Token-Validierung
  - Ungültige/abgelaufene/falsch-signierte Token
  - Authorisierter Zugriff mit gültigem JWT
  - User-Identity-Weitergabe aus JWT-Payload

**Hinweis:** E2E-Tests mocken den `NocoDBService`, da für die Testausführung keine
laufende NocoDB-Instanz benötigt wird. Der Auth-Flow (JWT-Guard, RolesGuard,
PermissionsGuard) wird dabei vollständig gegen die Mock-API getestet.

### Integrationstests (`test/integration/*.integration-spec.ts`)

Unit- und E2E-Tests mocken NocoDB. Ob die Middleware tatsächlich mit der NocoDB-API zusammenspielt, prüfen nur die Integrationstests. Sie laufen gegen eine **echte** NocoDB, jeder Lauf in einer frisch angelegten Base, die danach wieder gelöscht wird.

- `nocodb.service.integration-spec.ts` — Adapter: Meta-/Data-API v3, CRUD, Filter, Sortierung, Paging, 404-Verhalten, Tabellen-Präfix
- `app.integration-spec.ts` — komplette Middleware mit Produktions-Pipeline: Schema-Initialisierung (idempotent), Admin-Seed, Bootstrap, JWT-Prüfung gegen `users`, Rechteprüfung aus `table_permissions`, Tabellenkatalog

Lokal:

```bash
docker run -d --name nocodb-it -p 8080:8080 nocodb/nocodb:0.301.3
export NOCODB_IT_URL=http://localhost:8080
export $(node scripts/nocodb-it-setup.mjs)   # legt Admin + API-Token an
npm run test:integration
```

In CI läuft das im Job „Integration" mit NocoDB als Service-Container. Die Version dort (`0.301.3`) ist die, gegen die der Adapter verifiziert ist. Bei einem NocoDB-Update zuerst diesen Job mit der neuen Version laufen lassen.

## Teststrategie

1. Service-spezifische Unit-Tests zuerst
2. Danach Integrationsnahe Tests für Init/RBAC-Flows
3. E2E-Tests für kritische User-Journeys (Auth-Flow, geschützte Endpunkte)
4. Am Ende vollständiger Lauf mit `npm test -- --runInBand`

Für hängende Handles optional:

```bash
npm test -- --detectOpenHandles --runInBand
```
