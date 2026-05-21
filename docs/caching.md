# Caching

## Overview

The middleware uses two independent in-memory caches:

| Cache                   | Where                | TTL        | Key strategy                     |
| ----------------------- | -------------------- | ---------- | -------------------------------- |
| **HTTP response cache** | `CacheInterceptor`   | 60 seconds | Full request URL (`route:<url>`) |
| **Permissions cache**   | `PermissionsService` | 5 minutes  | User ID + table + action         |

## HTTP Response Cache

### `CacheInterceptor`

- File: `src/nocodb/interceptors/cache.interceptor.ts`
- Only caches `GET` requests; all other methods pass through uncached.
- Cache key: `route:<full URL>` — two requests to different URLs or query strings produce separate cache entries.
- Default TTL: **60 seconds** (hardcoded in the interceptor).
- Uses `NocoDBCacheService` (a thin wrapper around `@nestjs/cache-manager`).

### `NocoDBCacheService`

- File: `src/nocodb/cache/nocodb-cache.service.ts`
- Thin `get`/`set`/`del` wrapper around `@nestjs/cache-manager`.
- Can be injected into any service that needs transient in-memory caching.

## Permissions Cache

`PermissionsService` maintains a separate per-user permissions cache with a **5-minute TTL**. The cache is keyed on `userId + tableName + action` and is populated on the first permission check for that combination. Any mutation of roles or table-permissions via the admin endpoints should be followed by a permissions cache flush (currently a manual service restart or TTL expiry).

## Planned Improvements (OpenSpec)

- Endpoint-specific cache strategies instead of a blanket default.
- Explicit cache invalidation on permission mutations.
- Operational cache hit/miss metrics.
