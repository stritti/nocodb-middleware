---
layout: home

hero:
  name: NocoDB Middleware
  text: Robust NestJS middleware for NocoDB
  tagline: Authentication · RBAC · Caching · Error Handling · OpenAPI
  actions:
    - theme: brand
      text: Developer Guide
      link: /developer-guide
    - theme: alt
      text: API Reference
      link: /api
    - theme: alt
      text: View on GitHub
      link: https://github.com/stritti/nocodb-middleware

features:
  - icon: 🔌
    title: NocoDB Integration
    details: Type-safe repository pattern for NocoDB operations using Meta API v3 and Data API v3.
  - icon: 🔐
    title: JWT Validation
    details: Validates externally issued JWTs for protected routes.
  - icon: 🛡️
    title: RBAC
    details: Table-level CRUD permissions enforced in middleware and guards.
  - icon: ⚡
    title: Caching
    details: In-memory caching for read-heavy endpoints.
  - icon: 🚦
    title: Rate Limiting
    details: Protection against abusive traffic on the API boundary.
  - icon: 📖
    title: OpenAPI
    details: Swagger UI and static openapi.yaml for consumers.
  - icon: 🩺
    title: Health Check
    details: Ready for orchestration and monitoring probes.
  - icon: 🔭
    title: Tracing
    details: Optional OpenTelemetry integration.
---

## Dokumentation

- [Developer Guide](./developer-guide.md)
- [Security](./security.md)
- [Deployment](./deployment.md)
- [Database Schema](./database-schema.md)
- [API](./api.md)
- [Middleware](./middleware.md)
- [Error Handling](./error-handling.md)
- [Caching](./caching.md)
- [Testing](./testing.md)
- [Product Readiness](./product-readiness.md)
- [Versioning](./versioning.md)
