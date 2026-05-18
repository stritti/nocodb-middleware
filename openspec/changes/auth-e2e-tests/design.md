## Context

Die bestehenden E2E-Tests (`test/app.e2e-spec.ts`) starten die NestJS-App via `createTestingModule` und testen grundlegende HTTP-Routen. JWT, Roles und Permissions werden nur in Unit-Tests (mit gemocktem NocoDBService) geprüft.

Für E2E-Tests muss ein gültiger JWT generiert werden können, der gegen den konfigurierten `JWT_SECRET` valide ist.

## Goals / Non-Goals

**Goals:**
- E2E-Tests für: gültiger Token → 200, ungültiger Token → 401, abgelaufener Token → 401
- E2E-Tests für: RolesGuard mit korrekten/inkorrekten Rollen
- E2E-Tests für: PermissionsGuard mit ausreichenden/unzureichenden Berechtigungen
- Test-Helper `createTestToken(payload)` für die Test-Suite

**Non-Goals:**
- Kein NocoDB-Mocking in E2E (Tests gegen echte NocoDB sind nicht Teil dieser Änderung)
- Kein UI-Testing oder Browser-Automation
- Keine Änderung des Auth-Systems selbst

## Decisions

- **JWT-Generierung in Tests**: `@nestjs/jwt` `JwtService` aus dem Test-Modul nutzen
- **Test-Modul**: Vollständiges `Test.createTestingModule` mit allen Auth-Komponenten
- **Permissions-Guard Testing**: Decorator-basierte Endpoints in einem speziellen Test-Controller
- **Eigene Test-Datei**: `test/auth-flow.e2e-spec.ts` für klare Trennung

## Risks / Trade-offs

- [Risk] E2E-Tests können durch Config-Änderungen brechen → Test-Konfiguration isoliert halten
- [Risk] JWT-Secret in Tests muss mit CI-Secret übereinstimmen → `.env.test` oder inline-Secret
- [Risk] PermissionsGuard braucht NocoDB-Zugriff → Mocking auf Guard-Ebene für E2E
