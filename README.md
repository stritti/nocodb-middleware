# NocoDB Middleware

[![CI](https://github.com/stritti/nocodb-middleware/actions/workflows/ci.yml/badge.svg)](https://github.com/stritti/nocodb-middleware/actions/workflows/ci.yml)
[![Coverage](https://raw.githubusercontent.com/stritti/nocodb-middleware/badges/coverage.svg)](https://github.com/stritti/nocodb-middleware/actions/workflows/ci.yml)
[![Release](https://github.com/stritti/nocodb-middleware/actions/workflows/release.yml/badge.svg)](https://github.com/stritti/nocodb-middleware/actions/workflows/release.yml)

A NestJS middleware layer for NocoDB with JWT validation, role-based access control, caching, rate limiting, structured error handling, Swagger/OpenAPI, and optional OpenTelemetry tracing.

## What this project is

This project sits between your frontend or backend clients and NocoDB.
It adds application-level concerns that you typically do not want to solve directly in NocoDB:

- JWT validation for protected endpoints
- role and table permissions
- request logging and health checks
- rate limiting and security headers
- centralized validation and error handling
- cache support for read-heavy endpoints
- OpenAPI documentation for consumers

## What this project is not

This project validates JWTs, but it does **not** issue them.
There is no built-in login flow, no built-in identity provider, and no built-in cookie session handling.

You need one of these architectures:

1. A SPA that receives access tokens from an external IdP SDK and sends them as `Authorization: Bearer <token>`.
2. A backend-for-frontend or auth gateway that manages login, stores refresh tokens, and forwards access tokens to this middleware.

That distinction matters for security. A browser-only SPA should not be told to store tokens in `localStorage` unless you consciously accept the XSS tradeoff. The recommended production patterns are documented in `docs/developer-guide.md` and `docs/security.md`.

## Features

- Type-safe repository pattern for NocoDB access
- JWT authentication with Passport
- Role-based access control for table-level CRUD operations
- Request context middleware
- IP-based rate limiting
- Logging to console and files
- In-memory caching for GET-heavy workloads
- Structured exception handling
- `helmet` security headers
- Swagger UI and static `openapi.yaml`
- Global DTO validation with `class-validator`
- `/api/health` endpoint
- Optional OpenTelemetry tracing
- Unit and E2E test setup

## Quick start

### 1. Install dependencies

```bash
git clone https://github.com/stritti/nocodb-middleware.git
cd nocodb-middleware
npm install
```

### 2. Create `.env`

Use `.env.example` as the source of truth.

```env
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here
NOCODB_TABLE_PREFIX=

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d

CORS_ORIGINS=http://localhost:3000

PORT=3000
LOG_DIR=logs
```

Additional variables such as `BOOTSTRAP_ADMIN_TOKEN`, `NOCODB_BOOTSTRAP_ADMIN_USERNAME`, `OTEL_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and `LOG_LEVEL` are documented in `.env.example`.

### 3. Run the application

```bash
npm run start:dev
```

For production:

```bash
npm run build
npm run start:prod
```

### 4. Verify the service

```bash
curl http://localhost:3000/api/health
```

Swagger UI is available at:

```text
http://localhost:3000/api/docs
```

API info endpoint:

```text
http://localhost:3000/api
```

### 5. Call a protected endpoint

```bash
curl -X GET http://localhost:3000/api/examples \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Architecture overview

```text
Request
  │
  ├── LoggingMiddleware        logs method, URL, status, duration
  ├── RateLimitMiddleware      limits abusive traffic
  ├── JwtAuthGuard             validates Bearer token
  ├── NocoDbContextMiddleware  enriches request context
  ├── PermissionsGuard         enforces table-level CRUD permissions
  └── CacheInterceptor         caches GET responses
        │
        ▼
  Controller → Service → BaseRepository → NocoDBService → NocoDB API
```

## Security notes

Before deployment, check these points:

- Do not expose `NOCODB_API_TOKEN` to the browser.
- Restrict `CORS_ORIGINS` to trusted origins.
- Use HTTPS in every non-local environment.
- Validate how access tokens are stored in the frontend architecture.
- Review RBAC defaults before exposing admin routes.
- Rotate secrets and bootstrap tokens.
- Confirm that `/api/health`, `/api/docs`, and admin endpoints exposure matches your environment.

A more detailed checklist is in `docs/security.md`.

## Deployment

The repository already contains:

- `Dockerfile`
- `docker-compose.yml`
- GitHub Actions workflows for CI and release automation

Deployment guidance for local Docker, VPS, reverse proxy, observability, and production hardening is documented in `docs/deployment.md`.

## Documentation

- `docs/developer-guide.md` for SPA integration and extension patterns
- `docs/security.md` for token handling, CORS, secrets, and production security checks
- `docs/deployment.md` for Docker and operational deployment guidance
- `docs/database-schema.md` for the required NocoDB tables and relations
- `docs/product-readiness.md` for gaps and readiness assessment
- `docs/api.md` for the current API overview
- `docs/rbac-api.md` for focused permissions endpoint reference
- `docs/openapi-spec.md` for the rendered OpenAPI specification
- `docs/error-handling.md` for the error model
- `docs/caching.md` for caching behavior
- `docs/testing.md` for test strategy
- `docs/versioning.md` for release semantics

## Generate static OpenAPI spec

```bash
npm run build
npm run generate:openapi
```

This writes `openapi.yaml` to the project root.

## Health check response

```json
{
  "status": "ok",
  "timestamp": "2025-11-24T18:00:00.000Z",
  "uptime": 123.456
}
```

## License

This project is licensed under the [MIT License](LICENSE).
