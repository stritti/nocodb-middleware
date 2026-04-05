# NocoDB Middleware

[![CI](https://github.com/stritti/nocodb-middleware/actions/workflows/ci.yml/badge.svg)](https://github.com/stritti/nocodb-middleware/actions/workflows/ci.yml)
[![Coverage](https://raw.githubusercontent.com/stritti/nocodb-middleware/badges/coverage.svg)](https://github.com/stritti/nocodb-middleware/actions/workflows/ci.yml)
[![Release](https://github.com/stritti/nocodb-middleware/actions/workflows/release.yml/badge.svg)](https://github.com/stritti/nocodb-middleware/actions/workflows/release.yml)

A robust NestJS middleware for NocoDB with comprehensive authentication, caching, error handling, and API documentation.

## Features

✅ **NocoDB Integration** - Type-safe repository pattern for NocoDB operations  
✅ **JWT Authentication** - Secure authentication with Passport and JWT  
✅ **Role-Based Access Control** - Table-level CRUD permission guards  
✅ **Request Context Middleware** - User context enrichment  
✅ **Rate Limiting** - Protection against abuse (100 requests per 15 minutes)  
✅ **Logging Middleware** - Request/response logging with duration  
✅ **Caching Layer** - In-memory caching for read-heavy operations  
✅ **Error Handling** - Structured error responses with custom exceptions  
✅ **Security Headers** - `helmet` applied to every response  
✅ **OpenAPI/Swagger** - Interactive API documentation + static `openapi.yaml`  
✅ **Global Validation** - Automatic request validation with class-validator  
✅ **Health Check** - Service health monitoring  
✅ **Distributed Tracing** - Optional OpenTelemetry integration  
✅ **Testing** - Comprehensive unit and E2E tests  

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory (use `.env.example` as a template):

```env
# NocoDB connection
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here       # required for Meta API v3

# Optional table prefix (e.g. 'app_' → tables become 'app_users', 'app_roles')
NOCODB_TABLE_PREFIX=

# JWT – the middleware validates tokens; it does NOT issue them
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d

# CORS – comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000

# Server
PORT=3000
```

> **Note on authentication:** This middleware validates JWT tokens that are issued by an
> external identity provider.  It does not include a login endpoint.  Your frontend or
> auth service must mint the JWT and pass it as `Authorization: Bearer <token>`.

See `.env.example` for all variables including OpenTelemetry settings.

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Generate static OpenAPI spec
```bash
npm run build
npm run generate:openapi   # writes openapi.yaml to the project root
```

## API Documentation

Once the application is running, access the interactive Swagger UI at:

**🎯 [http://localhost:3000/api](http://localhost:3000/api)**

A committed `openapi.yaml` is available in the project root for offline use, code generation, or import into Postman/Insomnia.

## Architecture Overview

```
Request
  │
  ├── LoggingMiddleware        (logs method, URL, status, duration)
  ├── RateLimitMiddleware      (100 req / 15 min per IP)
  ├── JwtAuthGuard             (validates Bearer token)
  ├── NocoDbContextMiddleware  (enriches headers with user info + request-id)
  ├── PermissionsGuard         (table-level CRUD permission check)
  └── CacheInterceptor         (caches GET responses, 60 s TTL)
        │
        ▼
  Controller → Service → BaseRepository → NocoDBService → NocoDB API
```

## Project Structure

```
src/
├── auth/                 # JWT strategy & guards
├── config/              # Environment-based configuration
├── examples/            # Example REST resource (template for your own resources)
├── health/              # Health check endpoint
├── nocodb/
│   ├── cache/           # Cache service wrapper
│   ├── dto/             # Pagination DTOs
│   ├── exceptions/      # Custom NocoDBException
│   ├── filters/         # Global exception filter
│   ├── interceptors/    # GET caching interceptor
│   ├── middleware/      # Logging, rate-limit, context middleware
│   └── repositories/    # Abstract BaseRepository + example implementation
├── permissions/         # RBAC – guards, decorators, management endpoints
├── roles/               # Role CRUD service
├── tracing/             # OpenTelemetry bootstrap
└── users/               # User-role assignment service
```

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Product Readiness Analysis](docs/product-readiness.md) – gaps, recommendations, action plan
- [API Documentation](docs/api.md)
- [Middleware Documentation](docs/middleware.md)
- [Error Handling](docs/error-handling.md)
- [Caching](docs/caching.md)
- [Testing](docs/testing.md)
- [Versioning Strategy](docs/versioning.md)

## Versioning

This project uses **Semantic Versioning** (SemVer) driven by [Conventional Commits](https://www.conventionalcommits.org/).

| Commit prefix | Release type |
|---------------|-------------|
| `fix:`, `perf:`, `refactor:` | **patch** – `0.0.x` |
| `feat:` | **minor** – `0.x.0` |
| `type!:` / `BREAKING CHANGE:` | **major** – `x.0.0` |
| `docs:`, `chore:`, `ci:` | _(no release)_ |

Releases are created automatically on every push to `main` when a releasable commit is detected, or manually via **Actions → Release → Run workflow**.  
See [docs/versioning.md](docs/versioning.md) for the full strategy.

## Health Check

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "timestamp": "2025-11-24T18:00:00.000Z",
  "uptime": 123.456
}
```

## License

UNLICENSED
