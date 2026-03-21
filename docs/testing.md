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
```

## Aktueller Fokus der Tests

Der Testbestand deckt primär ab:

- NocoDB-Service-Schicht (`src/nocodb/*.spec.ts`)
- Cache-Service (`src/nocodb/cache/*.spec.ts`)
- Permissions/RBAC-Services (`src/permissions/*.spec.ts`)
- Rollen-/User-Rollen-Services (`src/roles/*.spec.ts`, `src/users/*.spec.ts`)
- JWT Strategy (`src/auth/strategies/*.spec.ts`)
- Basis-App (`src/app.controller.spec.ts`)

## Wichtiger Hinweis zum aktuellen Stand

Aktuell sind nicht alle Tests grün (bekannte Altlasten außerhalb der Doku-Änderungen):

- `src/nocodb/nocodb-v3.service.spec.ts`
  - Erwartet teils alte URL-/Payload-Formate
- `src/nocodb/database-initialization.service.spec.ts`
  - DI-Mocking für `NocoDBV3Service` unvollständig

## Empfohlene Teststrategie für kommende Changes

1. Service-spezifische Unit-Tests zuerst
2. Danach Integrationsnahe Tests für Init/RBAC-Flows
3. Am Ende vollständiger Lauf mit `npm test -- --runInBand`
4. Für hängende Handles optional:

```bash
npm test -- --detectOpenHandles --runInBand
```
