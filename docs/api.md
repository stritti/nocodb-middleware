# API Documentation

Diese Dokumentation beschreibt den aktuell vorhandenen API-Stand der NocoDB Middleware.

## Interactive Documentation

- Swagger UI: `http://localhost:3000/api`

## Authentication

- Geschützte Endpunkte erwarten JWT im Header:

```http
Authorization: Bearer <jwt>
```

## Aktuelle Endpunkte

### Health

- `GET /health`
  - Zweck: Liveness/Health-Check
  - Auth: Nein

### RBAC / Permissions Management

Basispfad: ` /admin/permissions `

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

> Hinweis: Zugriff auf diese Endpunkte wird zusätzlich über `PermissionsGuard` und die `@Require*`-Decorators gesteuert.

## Validation

Globale `ValidationPipe` ist aktiv:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

## Error Format

Fehler werden über den globalen `NocoDBExceptionFilter` vereinheitlicht.
Siehe: `docs/error-handling.md`.

## Geplante Endpunkte (noch nicht implementiert)

- Optionale Tabellenkatalog-API (Name↔ID-Mapping, ohne interne Middleware-Systemtabellen)
  - Spezifiziert in OpenSpec: `build-nestjs-nocodb-v3-middleware/specs/v3-table-catalog-exposure/spec.md`
