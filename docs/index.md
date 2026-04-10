---
layout: home

hero:
  name: NocoDB Middleware
  text: Robust NestJS middleware for NocoDB
  tagline: Authentication · Caching · Error Handling · OpenAPI Documentation
  actions:
    - theme: brand
      text: Get Started
      link: /middleware
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
    title: JWT Authentication
    details: Secure authentication with Passport and JWT. Validates tokens issued by an external identity provider.
  - icon: 🛡️
    title: Role-Based Access Control
    details: Table-level CRUD permission guards to protect your resources with fine-grained access control.
  - icon: ⚡
    title: Caching Layer
    details: In-memory caching for read-heavy operations with a configurable TTL.
  - icon: 🚦
    title: Rate Limiting
    details: Protection against abuse with 100 requests per 15-minute window per IP address.
  - icon: 📖
    title: OpenAPI / Swagger
    details: Interactive API documentation plus a static openapi.yaml for offline use or code generation.
  - icon: 🩺
    title: Health Check
    details: Service health monitoring endpoint ready for container orchestration probes.
  - icon: 🔭
    title: Distributed Tracing
    details: Optional OpenTelemetry integration for end-to-end request visibility.
---

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { site } = useData()
const currentVersion = computed(() => site.value.themeConfig.semver.version)
</script>


Aktuelle Version (Semver Major.Minor.Patch): **{{ currentVersion }}**

## Inhalte

- [API](./api.md)
- [Middleware](./middleware.md)
- [Error Handling](./error-handling.md)
- [Caching](./caching.md)
- [RBAC API](./rbac-api.md)
- [NocoDB v3 Beispiele](./nocodb-v3-usage-examples.md)
- [Testing](./testing.md)
- [TODO](./TODO-NocoDB-Middleware.md)
- [OpenSpec](./openspec/index.md)
