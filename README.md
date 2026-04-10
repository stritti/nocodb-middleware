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
✅ **Logging Middleware** - Request/response logging with duration to console and files (`/logs` directory)
✅ **Caching Layer** - In-memory caching for read-heavy operations  
✅ **Error Handling** - Structured error responses with custom exceptions  
✅ **Security Headers** - `helmet` applied to every response  
✅ **OpenAPI/Swagger** - Interactive API documentation + static `openapi.yaml`  
✅ **Global Validation** - Automatic request validation with class-validator  
✅ **Health Check** - Service health monitoring  
✅ **Distributed Tracing** - Optional OpenTelemetry integration  
✅ **Testing