# API

This page describes the current API of the middleware, including auth modes and example requests.

## Base URLs

- API prefix: `http://localhost:3000/api`
- Swagger UI (dev only): `http://localhost:3000/api/docs`
- Static spec: `openapi.yaml` in the repository root

## Authentication

### 1. JWT for protected endpoints

```http
Authorization: Bearer <jwt>
```

All of the following claim fields are accepted by `IdentityClaimsNormalizerService`:

| JWT claim                          | Internal field | Notes                                                                |
| ---------------------------------- | -------------- | -------------------------------------------------------------------- |
| `sub`                              | `userId`       | **Required.** Numeric string for `local`, any string for `external`. |
| `username` or `preferred_username` | `username`     | `preferred_username` takes priority (OIDC standard).                 |
| `email`                            | `email`        | Optional.                                                            |
| `roles` or `role`                  | `roles[]`      | Arrays or space/comma-separated strings are both accepted.           |
| `scope` or `scp`                   | `scope[]`      | Relevant for external providers.                                     |

Minimal example (local provider):

```json
{
  "sub": 123,
  "username": "alice",
  "roles": ["admin"]
}
```

OIDC-compatible example (external provider):

```json
{
  "sub": "a1b2c3",
  "preferred_username": "alice",
  "email": "alice@example.com",
  "roles": ["admin", "editor"]
}
```

### 2. Bootstrap token for the initial admin

The `POST /api/bootstrap/admin` endpoint uses **no JWT**. Instead it reads:

```http
x-bootstrap-token: <BOOTSTRAP_ADMIN_TOKEN>
```

## Endpoints

### Health

- `GET /api/health`
- Auth: none

```bash
curl http://localhost:3000/api/health
```

Example response:

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

Example response:

```json
{
  "success": true,
  "userId": 1,
  "username": "admin",
  "created": true
}
```

### User Provisioning (Admin only)

These endpoints require JWT + the `admin` role.

#### Create user

- `POST /api/users`
- Auth: JWT (`admin` role required)

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "StrongP@ssword123!"
  }'
```

#### Update user status

- `PATCH /api/users/:id/status`
- Auth: JWT (`admin` role required)

```bash
curl -X PATCH http://localhost:3000/api/users/42/status \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
```

### RBAC: Roles and Permissions

Base path: `/api/admin/permissions`

All endpoints require JWT. The `PermissionsGuard` with `@Require*` decorators applies additional per-table checks.

| Method   | Path                                         | Description                                   |
| -------- | -------------------------------------------- | --------------------------------------------- |
| `POST`   | `/roles`                                     | Create a role                                 |
| `GET`    | `/roles`                                     | List all roles                                |
| `DELETE` | `/roles/:roleId`                             | Delete a role                                 |
| `POST`   | `/table-permissions`                         | Set/update CRUD rights for a role on a table  |
| `POST`   | `/table-permissions/batch`                   | Set multiple table permissions in one request |
| `GET`    | `/roles/:roleId/permissions`                 | List permissions of a role                    |
| `DELETE` | `/roles/:roleId/permissions`                 | Delete all permissions of a role              |
| `POST`   | `/roles/:sourceRoleId/copy-to/:targetRoleId` | Copy permissions from one role to another     |
| `POST`   | `/user-roles/assign`                         | Assign a role to a user                       |
| `POST`   | `/user-roles/assign-multiple`                | Assign multiple roles at once                 |
| `DELETE` | `/user-roles/users/:userId/roles/:roleId`    | Remove a role from a user                     |
| `GET`    | `/users/:userId/roles`                       | List roles of a user                          |

Example: list roles

```bash
curl http://localhost:3000/api/admin/permissions/roles \
  -H "Authorization: Bearer <jwt>"
```

Example: set table permission

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

Example: assign role to user

```bash
curl -X POST http://localhost:3000/api/admin/permissions/user-roles/assign \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 42,
    "roleId": 1
  }'
```

### Table Catalog (Admin)

- `GET /api/meta/tables`
- Auth: JWT + `admin` role

Returns all non-system tables visible in the NocoDB workspace (excludes `users`, `roles`, `user_roles`, `table_permissions`).

```bash
curl http://localhost:3000/api/meta/tables \
  -H "Authorization: Bearer <jwt>"
```

## Validation and Error Format

The global `ValidationPipe` is active with:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Errors are normalised by the global `NocoDBExceptionFilter`.
See `docs/error-handling.md` for the full error schema.
