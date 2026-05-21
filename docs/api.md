# API

Diese Seite beschreibt den aktuellen API-Stand der Middleware inklusive Auth-Modi und Beispiel-Requests.

## Basis-URLs

- API Prefix: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- Statische Spezifikation: `openapi.yaml` im Repository Root

## Authentifizierung

### 1. JWT für geschützte Endpunkte

```http
Authorization: Bearer <jwt>
```

Minimal erwartete JWT Claims (aus `JwtStrategy`):

```json
{
  "sub": 123,
  "username": "alice",
  "roles": ["admin"]
}
```

### 2. Bootstrap-Token für Initial-Admin

Der Endpoint `POST /api/bootstrap/admin` nutzt **kein JWT**, sondern den Header:

```http
x-bootstrap-token: <BOOTSTRAP_ADMIN_TOKEN>
```

## Kernendpunkte

### Health

- `GET /api/health`
- Auth: nein

```bash
curl http://localhost:3000/api/health
```

Beispielantwort:

```json
{
  "status": "ok",
  "timestamp": "2026-04-13T12:00:00.000Z",
  "uptime": 123.456
}
```

### Bootstrap Admin

- `POST /api/bootstrap/admin`
- Auth: `x-bootstrap-token`

```bash
curl -X POST http://localhost:3000/api/bootstrap/admin \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: <BOOTSTRAP_ADMIN_TOKEN>" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "StrongP@ssword123!"
  }'
```

Beispielantwort:

```json
{
  "success": true,
  "userId": 1,
  "username": "admin",
  "created": true
}
```

### RBAC: Rollen und Berechtigungen

Basispfad: `/api/admin/permissions`

- `POST /roles`
- `GET /roles`
- `DELETE /roles/:roleId`
- `POST /table-permissions`
- `POST /table-permissions/batch`
- `GET /roles/:roleId/permissions`
- `DELETE /roles/:roleId/permissions`
- `POST /roles/:sourceRoleId/copy-to/:targetRoleId`
- `POST /user-roles/assign`
- `POST /user-roles/assign-multiple`
- `DELETE /user-roles/users/:userId/roles/:roleId`
- `GET /users/:userId/roles`

Hinweis: Neben JWT greift auf diesen Endpunkten zusätzlich der `PermissionsGuard` mit `@Require*`-Decorators.

Beispiel: Rollen abrufen

```bash
curl http://localhost:3000/api/admin/permissions/roles \
  -H "Authorization: Bearer <jwt>"
```

Beispiel: Tabellenberechtigung setzen

```bash
curl -X POST http://localhost:3000/api/admin/permissions/table-permissions \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 1,
    "tableName": "users",
    "canCreate": true,
    "canRead": true,
    "canUpdate": true,
    "canDelete": false
  }'
```

Beispiel: Rolle einem User zuweisen

```bash
curl -X POST http://localhost:3000/api/admin/permissions/user-roles/assign \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 42,
    "roleId": 1
  }'
```

### Tabellenkatalog (Admin)

- `GET /api/meta/tables`
- Auth: JWT + Rolle `admin`

```bash
curl http://localhost:3000/api/meta/tables \
  -H "Authorization: Bearer <jwt>"
```

## Validierung und Fehlerformat

Globale `ValidationPipe` ist aktiv:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Fehler werden über den globalen `NocoDBExceptionFilter` vereinheitlicht.
Details: `docs/error-handling.md`.
