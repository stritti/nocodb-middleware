# NocoDB Middleware

A robust NestJS middleware for NocoDB with comprehensive authentication, caching, error handling, and API documentation.

## Features

✅ **NocoDB Integration** - Type-safe repository pattern for NocoDB operations  
✅ **JWT Authentication** - Secure authentication with Passport and JWT  
✅ **Role-Based Access Control** - Guards for authorization  
✅ **Request Context Middleware** - User context enrichment  
✅ **Rate Limiting** - Protection against abuse (100 requests per 15 minutes)  
✅ **Logging** - Request/response logging to console and files (`/logs` directory)
✅ **Caching Layer** - In-memory caching for read-heavy operations  
✅ **Error Handling** - Structured error responses with custom exceptions  
✅ **OpenAPI/Swagger** - Interactive API documentation  
✅ **Global Validation** - Automatic request validation with class-validator  
✅ **Health Check** - Service health monitoring  
✅ **Testing** - Comprehensive unit and E2E tests  

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BOOTSTRAP_ADMIN_USERNAME=admin
NOCODB_BASE_ID=your_base_id_here
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
PORT=3000
LOG_DIR=logs
```

See `.env.example` for the template.

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

> **Note**: The project maintains >80% test coverage on critical business logic services.

### CI/CD

Automated testing is configured via GitHub Actions.


## API Documentation

Once the application is running, access the interactive Swagger UI at:

**🎯 [http://localhost:3000/api](http://localhost:3000/api)**

## Project Structure

```
src/
├── auth/                 # Authentication (JWT, Guards, Strategies)
├── config/              # Configuration files
├── examples/            # Example REST resource
├── health/              # Health check endpoint
├── nocodb/
│   ├── cache/           # Caching service
│   ├── dto/             # Data Transfer Objects
│   ├── exceptions/      # Custom exceptions
│   ├── filters/         # Exception filters
│   ├── interceptors/    # Cache interceptor
│   ├── middleware/      # Context, Rate Limit, Logging
│   └── repositories/    # Repository pattern for NocoDB
└── app.module.ts        # Root module
```

## Documentation

Detailed documentation is available in the `docs/` directory:

- [API Documentation](docs/api.md)
- [Middleware Documentation](docs/middleware.md)
- [Error Handling](docs/error-handling.md)
- [Caching](docs/caching.md)
- [Testing](docs/testing.md)

## Health Check

Check service health:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-24T18:00:00.000Z",
  "uptime": 123.456
}
```

## License

UNLICENSED
