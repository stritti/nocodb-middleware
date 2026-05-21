# Developer Guide

## Purpose

`nocodb-middleware` is a NestJS layer between clients and NocoDB. It bundles JWT authentication, role-based permissions, rate limiting, logging, caching, and a documented REST API.

Use this middleware when you:

- Do not want to expose NocoDB directly to frontend clients.
- Need to keep `NOCODB_API_TOKEN` isolated on the server side.
- Want to enforce table-level permissions centrally.
- Need a stable, versioned API layer in front of NocoDB.

## Authentication Model

The middleware validates Bearer JWTs. It does **not** issue login sessions and does **not** manage refresh tokens. An external identity provider (or your own auth gateway) must mint the tokens.

### Auth Provider Modes

Configure via the `AUTH_PROVIDER` environment variable:

| Mode       | Description                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`    | JWTs are validated with `JWT_SECRET`. On each request the `sub` claim is used to look up the user in the NocoDB `users` table; the user must exist and have `is_active = true`.               |
| `external` | JWTs are validated with `EXTERNAL_JWT_SECRET`. Optionally checks `EXTERNAL_JWT_ISSUER` and `EXTERNAL_JWT_AUDIENCE`. The middleware then auto-provisions the user into NocoDB on first access. |

**Fail-closed behaviour:** if `AUTH_PROVIDER=external` is set but `EXTERNAL_JWT_SECRET` is missing, the application refuses to start.

### Supported JWT Claim Fields

The `IdentityClaimsNormalizerService` maps any of the following standard claim fields to the internal identity model:

| JWT claim                          | Maps to    | Notes                                                            |
| ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| `sub`                              | `userId`   | Required. Numeric string for `local`, any string for `external`. |
| `username` or `preferred_username` | `username` | `preferred_username` takes priority (OIDC standard).             |
| `email`                            | `email`    | Optional.                                                        |
| `roles` or `role`                  | `roles[]`  | Arrays or space/comma-separated strings are both accepted.       |
| `scope` or `scp`                   | `scope[]`  | Primarily relevant for `external` providers.                     |

## Security Rules

- Never pass `NOCODB_API_TOKEN` to browser clients.
- Set `CORS_ORIGINS` restrictively in production. The application logs a warning at startup if a wildcard (`*`) or localhost origin is detected in production mode.
- Swagger UI is automatically disabled in production (`NODE_ENV=production`).
- Create the bootstrap admin only via the protected `/api/bootstrap/admin` endpoint with `BOOTSTRAP_ADMIN_TOKEN`.
- Debug and cleanup scripts are excluded from the production build.

## Local Quick Start

```bash
npm install
cp .env.example .env
npm run start:dev
```

Minimum required configuration:

```env
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:3000
```

After starting:

- API root: `http://localhost:3000/api`
- Swagger UI (dev only): `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/api/health`

## Frontend Integration

Clients attach the access token to every request:

```ts
export async function apiRequest<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`http://localhost:3000${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

For production browser applications, a BFF (Backend-for-Frontend) or auth gateway is recommended so that refresh tokens stay in `httpOnly` cookies and the browser never has to store the access token permanently.

## Adding Your Own Resources

New NocoDB tables are typically wired in through a Repository, Service, and Controller. Always protect write or sensitive endpoints with guards and DTO validation.

### Repository Pattern

`BaseRepository<T>` takes a NocoDB **table ID** (not a name). Because table IDs are only known after NocoDB has started, resolve the ID in `onModuleInit()`:

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { BaseRepository } from '../nocodb/repositories/base.repository';
import { NocoDBService } from '../nocodb/nocodb.service';

export interface ProductEntity {
  id: number;
  name: string;
  price: number;
}

@Injectable()
export class ProductsRepository
  extends BaseRepository<ProductEntity>
  implements OnModuleInit
{
  private readonly tableName = 'products';

  constructor(nocoDBService: NocoDBService) {
    // Pass empty string initially; resolved below
    super(nocoDBService, '');
  }

  async onModuleInit(): Promise<void> {
    const table = await this.nocoDBService.getTableByName(this.tableName);
    if (!table) {
      throw new Error(
        `ProductsRepository: table '${this.tableName}' not found in NocoDB.`,
      );
    }
    this.tableId = table.id;
  }
}
```

The same pattern is used by the built-in `ExampleRepository` (`src/nocodb/repositories/example.repository.ts`).

### Request Context Headers

After `JwtAuthGuard` validates a token, `NocoDbContextMiddleware` enriches every downstream request with the following headers:

| Header                | Content                                                        |
| --------------------- | -------------------------------------------------------------- |
| `x-nocodb-user-id`    | Stringified `userId` from the JWT payload                      |
| `x-nocodb-user-roles` | Comma-separated roles from the JWT payload                     |
| `x-request-id`        | UUID generated per request (passed through if already present) |

## Operations

Key production considerations:

- Enforce HTTPS via a reverse proxy.
- Inject secrets via a secret manager or secure CI/CD mechanism; never commit them.
- Keep health checks and structured logging active.
- Optionally connect OpenTelemetry to a collector (`OTEL_ENABLED=true`, `OTEL_EXPORTER_OTLP_ENDPOINT=...`).
- Treat `DatabaseInitializationService` as a schema bootstrap helper, not a migration tool. Verify the NocoDB table structure manually after the first start (see `docs/database-schema.md`).

## Troubleshooting

| Symptom                    | Likely Cause                                                | Check                                      |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `401 Unauthorized`         | JWT missing or invalid                                      | Bearer header, secret match, token expiry  |
| `403 Forbidden`            | Role or table permission missing                            | RBAC configuration and guards              |
| `429 Too Many Requests`    | Rate limit triggered                                        | Request rate and middleware configuration  |
| `404 Not Found`            | Wrong path or table name                                    | Controller route and repository table name |
| CORS error in browser      | Origin not allowed                                          | `CORS_ORIGINS` environment variable        |
| Application fails to start | `NOCODB_API_TOKEN`, `NOCODB_BASE_ID`, or JWT secret missing | `.env` file and all required variables     |

## API Reference

For concrete endpoint examples and payloads see `docs/api.md` and the generated OpenAPI specification in the repository root (`openapi.yaml`).
