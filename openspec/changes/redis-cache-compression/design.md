## Context

### Aktuelle Caching-Architektur
- `@nestjs/cache-manager` mit `CacheModule.register({ isGlobal: true })`
- Standard-Speicher: in-Memory (Map)
- TTL: 5 Minuten für HTTP-Cache, 5 Minuten für Permissions-Cache
- Max: 100 Items

Für Multi-Instanz-Deployments (Docker Compose mit mehreren Replicas, Kubernetes) ist in-Memory-Cache problematisch: Jede Instanz hat ihren eigenen, inkonsistenten Cache.

### Response-Kompression
- Express bietet `compression`-Middleware
- Unterstützt gzip (Standard) und brotli (mit Node.js zlib)
- Wird in `main.ts` global registriert
- Komprimiert nur Text-Responses (JSON, HTML)

## Goals / Non-Goals

**Goals:**
- Redis als Cache-Store (wenn verfügbar, sonst in-Memory-Fallback)
- Konfigurierbar via `REDIS_URL` ENV-Variable
- Response-Kompression via `compression`-Middleware
- `COMPRESSION_ENABLED` (default: true) und `COMPRESSION_LEVEL` ENV-Variablen

**Non-Goals:**
- Kein Redis-Cluster-Support (Single-Instance Redis reicht)
- Kein Cache-Invalidation-Pattern (TTL-basiert)
- Keine Streaming-Kompression (Middleware komprimiert komplette Responses)

## Decisions

- **Redis-Bibliothek**: `ioredis` + `cache-manager-redis-yet` (kompatibel mit NestJS v11/cache-manager v7+)
- **Cache-Key-Präfix**: `nocodb-middleware:` für Multi-Tenant-Support
- **Kompression-Level**: Standard (gzip level 6) – Balance zwischen Kompressionsrate und CPU
- **Threshold**: Nur Responses > 1KB komprimieren (kleine Payloads lohnen nicht)

## Risks / Trade-offs

- [Risk] Redis-Ausfall → App muss ohne Cache weiterlaufen → in-Memory-Fallback
- [Risk] Kompression kann SSO-Vulnerabilitäten begünstigen → Threshold > 1KB als Schutz
- [Risk] Zusätzliche Latenz durch Redis-Netzwerk-Calls (0.5-2ms) → für read-lastige Workloads trotzdem schneller als NocoDB-Request
