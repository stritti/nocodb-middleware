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
✅ **Testing** - Unit tests and E2E smoke testing  

## ⚡ Erste Schritte in 5 Minuten

### **1️⃣ Middleware klonen und installieren**
```bash
git clone https://github.com/stritti/nocodb-middleware.git
cd nocodb-middleware
npm install
```

### **2️⃣ `.env` konfigurieren**
Kopiere die `.env.example` und passe sie an:
```env
# NocoDB Connection
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

> **📌 Hinweis zur Authentifizierung:**
> Diese Middleware **validiert** JWT-Tokens, die von einem **externen Identity-Provider** ausgestellt werden.  
> Sie enthält **keinen eigenen Login-Endpoint**. Dein Frontend oder Auth-Service muss das JWT erstellen und als `Authorization: Bearer <token>` weitergeben.

### **3️⃣ Middleware starten**
```bash
# Entwicklungsmodus
npm run start:dev

# Produktionsmodus
npm run build
npm run start:prod
```
- Die Middleware läuft auf `http://localhost:3000`
- **Swagger UI:** [http://localhost:3000/api](http://localhost:3000/api)
- **Health Check:** [http://localhost:3000/health](http://localhost:3000/health)

### **4️⃣ API-Aufruf testen**
```bash
# Nutzerdaten abrufen (mit JWT-Token)
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer DEIN_JWT_TOKEN"
```

---

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory (use `.env.example