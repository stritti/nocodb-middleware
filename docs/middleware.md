# Middleware Documentation

This document describes the middleware components integrated into the NocoDB Middleware application.

## Overview

Middleware functions have access to the request object (`req`), the response object (`res`), and the next middleware function in the application’s request-response cycle.

## Components

### 1. Logging Middleware
- **File**: `src/nocodb/middleware/logging.middleware.ts`
- **Purpose**: Logs details about incoming requests and their duration.
- **Details**:
  - Logs Method, URL, Status Code, User Agent, and Response Time.
  - Applied globally to all routes.

### 2. Rate Limit Middleware
- **File**: `src/nocodb/middleware/rate-limit.middleware.ts`
- **Purpose**: Protects the application from brute-force attacks and excessive usage.
- **Configuration**:
  - Window: 15 minutes
  - Max Requests: 100 per IP
  - Uses `express-rate-limit`.
- **Details**:
  - Sets `RateLimit-*` headers on the response.

### 3. NocoDB Context Middleware
- **File**: `src/nocodb/middleware/nocodb-context.middleware.ts`
- **Purpose**: Enriches the request with NocoDB-specific context.
- **Details**:
  - Extracts user information from the request (if authenticated).
  - Sets `x-nocodb-user-id` and `x-nocodb-user-roles` headers for downstream use.
  - Generates a unique `x-request-id` for tracing if one is not present.

## Usage

All middleware is registered in `NocoDBModule` and applied globally to all routes by default.

```typescript
// src/nocodb/nocodb.module.ts
export class NocoDBModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    consumer.apply(NocoDbContextMiddleware).forRoutes('*');
  }
}
```
