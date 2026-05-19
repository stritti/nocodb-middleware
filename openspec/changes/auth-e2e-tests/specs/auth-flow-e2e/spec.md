## ADDED Requirements

### Requirement: JWT-Authentifizierung E2E-Test
Die E2E-Test-Suite SHALL den vollständigen JWT-Authentifizierungs-Flow gegen einen Test-Controller testen.

#### Scenario: Gültiger JWT
- **GIVEN** ein gültiger JWT wurde mit dem konfigurierten `JWT_SECRET` erstellt
- **WHEN** ein GET-Request an einen geschützten Endpoint mit `Authorization: Bearer <token>` gesendet wird
- **THEN** wird der Request mit HTTP 200 beantwortet

#### Scenario: Fehlender JWT
- **GIVEN** kein Authorization-Header
- **WHEN** ein GET-Request an einen geschützten Endpoint gesendet wird
- **THEN** wird der Request mit HTTP 401 Unauthorized beantwortet

#### Scenario: Manipulierter JWT
- **GIVEN** ein Token mit falscher Signatur
- **WHEN** ein GET-Request mit diesem Token gesendet wird
- **THEN** wird der Request mit HTTP 401 Unauthorized beantwortet

#### Scenario: Abgelaufener JWT
- **GIVEN** ein Token mit abgelaufener `exp`-Claim
- **WHEN** ein GET-Request mit diesem Token gesendet wird
- **THEN** wird der Request mit HTTP 401 Unauthorized beantwortet

### Requirement: Rollen-basierte Autorisierung E2E-Test
Die E2E-Test-Suite SHALL den RolesGuard mit korrekten und inkorrekten Rollen testen.

#### Scenario: Korrekte Rolle
- **GIVEN** ein JWT mit `roles: ['admin']` und ein Endpoint mit `@Roles('admin')`
- **WHEN** ein GET-Request gesendet wird
- **THEN** wird der Request mit HTTP 200 beantwortet

#### Scenario: Fehlende Rolle
- **GIVEN** ein JWT mit `roles: ['user']` und ein Endpoint mit `@Roles('admin')`
- **WHEN** ein GET-Request gesendet wird
- **THEN** wird der Request mit HTTP 403 Forbidden beantwortet

### Requirement: Permission-basierte Autorisierung E2E-Test
Die E2E-Test-Suite SHALL den PermissionsGuard mit ausreichenden und unzureichenden Berechtigungen testen.

#### Scenario: Ausreichende Berechtigung
- **GIVEN** `PermissionsService.canUserPerformAction` ist gestubbt und gibt `true` zurück
- **GIVEN** ein gültiger JWT mit `userId=1` liegt vor
- **WHEN** ein GET-Request mit diesem JWT an `@RequireRead('users')` Endpoint gesendet wird
- **THEN** durchläuft der PermissionsGuard die reale `canActivate`-Logik (Reflector-Metadaten, User-Extraktion, ForEach-Schleife)
- **AND** wird der Request mit HTTP 200 beantwortet

#### Scenario: Unzureichende Berechtigung
- **GIVEN** `PermissionsService.canUserPerformAction` ist gestubbt und gibt `false` zurück
- **GIVEN** ein gültiger JWT mit `userId=1` liegt vor
- **WHEN** ein GET-Request mit diesem JWT an `@RequireRead('users')` Endpoint gesendet wird
- **THEN** durchläuft der PermissionsGuard die reale `canActivate`-Logik
- **AND** wird der Request mit HTTP 403 Forbidden beantwortet
