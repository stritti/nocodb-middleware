## Why

Zwei Performance-Lücken für Production-Betrieb:

1. **In-Memory-Cache skaliert nicht**: Aktuell verwendet der CacheManager `cache-manager` mit in-Memory-Speicher. Bei Multi-Instanz-Betrieb (Horizontal Scaling) hat jede Instanz ihren eigenen Cache – keine Konsistenz, keine Speicher-Effizienz.
2. **Keine Response-Kompression**: JSON-Responses werden unkomprimiert ausgeliefert. Bei größeren Payloads (paginierte Listen, verschachtelte Daten) steigt die Netzwerk-Latenz unnötig.

Beide Features sind für den Production-Betrieb bei mittlerer bis hoher Last empfohlen.

## What Changes

- Redis als Cache-Store integrieren (via `@nestjs/cache-manager` + `ioredis` / `cache-manager-redis-store`)
- Fallback auf in-Memory wenn Redis nicht verfügbar
- Response-Kompression via `compression`-Middleware (gzip/brotli)
- Konfigurierbar via ENV: `REDIS_URL`, `CACHE_TTL`, `COMPRESSION_ENABLED`

## Capabilities

### New Capabilities
- `redis-cache-integration`: Redis-basierter Cache mit Fallback auf in-Memory.
- `response-compression`: Automatische gzip/brotli-Kompression für HTTP-Responses.

### Modified Capabilities
- `AppModule` – CacheModule-Konfiguration via ConfigService
- `main.ts` – Compression-Middleware

## Impact

- Neue Abhängigkeiten: `ioredis`, `cache-manager-redis-yet` (Redis v7+)
- Optional: Redis muss nicht verfügbar sein (Fallback auf in-Memory)
- Kompression erhöht CPU-Last minimal (ca. 5-10%), reduziert Netzwerk-Last um 60-80%
- Keine Breaking Changes
