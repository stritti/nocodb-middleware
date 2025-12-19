# Caching Documentation

This document describes the caching layer implemented in the NocoDB Middleware.

## Overview

The application uses `@nestjs/cache-manager` to provide an in-memory caching mechanism. This helps reduce the load on the NocoDB API for frequently accessed data.

## Components

### `NocoDBCacheService`
- **File**: `src/nocodb/cache/nocodb-cache.service.ts`
- **Purpose**: A wrapper around the underlying cache manager.
- **Methods**:
  - `get<T>(key)`: Retrieve a value from the cache.
  - `set(key, value, ttl?)`: Store a value in the cache.
  - `del(key)`: Remove a value from the cache.

### `CacheInterceptor`
- **File**: `src/nocodb/interceptors/cache.interceptor.ts`
- **Purpose**: Automatically caches GET requests.
- **Behavior**:
  - Checks if a response for the current URL exists in the cache.
  - If found (Cache Hit), returns the cached response immediately.
  - If not found (Cache Miss), proceeds with the request and caches the response for 60 seconds (default).

## Configuration

The cache is configured in `NocoDBModule` using `CacheModule.register()`. By default, it uses an in-memory store.

## Usage

To use caching on a specific controller or route, apply the `CacheInterceptor`:

```typescript
import { UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from './nocodb/interceptors/cache.interceptor';

@Controller('my-resource')
@UseInterceptors(CacheInterceptor)
export class MyController {
  @Get()
  findAll() {
    // ...
  }
}
```
