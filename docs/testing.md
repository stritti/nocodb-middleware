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

## Bekannte Altlasten

Nicht alle Unit-Tests sind derzeit grün (vorhandene Altlasten):

- `src/nocodb/database-initialization.service.spec.ts` — DI-Mocking für `NocoDBV3Service` unvollständig

## Teststrategie

1. Service-spezifische Unit-Tests zuerst
2. Danach Integrationsnahe Tests für Init/RBAC-Flows
3. E2E-Tests für kritische User-Journeys (Auth-Flow, geschützte Endpunkte)
4. Am Ende vollständiger Lauf mit `npm test -- --runInBand`

Für hängende Handles optional:

```bash
npm test -- --detectOpenHandles --runInBand
```
