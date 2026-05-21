# Architecture Analysis: NocoDB Middleware

> Stand: 2026-05-18
> NestJS v11 Middleware zwischen Frontend-Clients und NocoDB v3

---

## 1. Projektzweck

Dieser Service sitzt als **Reverse Proxy / Middleware-Layer** zwischen beliebigen Frontend- oder Backend-Clients und einer NocoDB-Instanz. Er ergänzt NocoDB um typische Application-Concerns, die man nicht in NocoDB selbst lösen möchte:

- JWT-Validierung (via Passport)
- Role-Based Access Control (Table-Level CRUD)
- Request Logging (Pino) und Health Checks
- Rate Limiting und Security Headers (Helmet)
- Zentrale Validierung (class-validator) und Error Handling
- In-Memory Caching für read-lastige Workloads
- OpenAPI-Dokumentation (Swagger)
- Optional: OpenTelemetry Distributed Tracing

---

## 2. High-Level Architektur

```
                     ┌─────────────────────────────────────────┐
                     │           External Clients               │
                     │  (SPA, BFF, API Gateway, Mobile App)     │
                     └──────────────┬──────────────────────────┘
                                    │ Authorization: Bearer <JWT>
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NocoDB Middleware (NestJS)                     │
│                                                                   │
│  Request Pipeline:                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Helmet  │  │Rate Limit│  │  Pino    │  │  JwtAuthGuard    │ │
│  │ Security │─▶│100/15min │─▶│ Logging  │─▶│  (Passport/JWT)  │ │
│  │ Headers  │  │          │  │          │  │                  │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┬─────────┘ │
│                                                      │           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────▼────────┐ │
│  │NocoDbContextMware │  │PermissionsGuard   │  │ Cache Intercpt │ │
│  │ (User-Context)   │◀─│ (Table-CRUD-Check)│◀─│ (GET-Caching) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────────┘ │
│           │                     │                                │
│           ▼                     ▼                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Application Layer (Controller/Service)         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │TableCatalog  │  │Permissions   │  │  Roles/User    │  │   │
│  │  │Controller    │  │Mgmt Controller│  │  Services      │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  └─────────┼─────────────────┼───────────────────┼───────────┘   │
│            │                 │                   │               │
│            ▼                 ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            BaseRepository<T> (abstrakt)                   │   │
│  │  findMany | findOne | create | update | delete            │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              NocoDBService                                 │   │
│  │  Meta API v3 (Tables/Columns) + Data API v3 (CRUD)        │   │
│  │  + eigenes Rate-Limiting (200ms) + OTel-Tracing           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP (axios)
                          ▼
              ┌────────────────────────┐
              │      NocoDB v3 API     │
              │  (Meta + Data API)     │
              └────────────────────────┘
```

---

## 3. Modul-Struktur

### 3.1 AppModule (Root)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 5min, max: 100 }),
    LoggerModule.forRoot({ pinoHttp: { ... } }), // Pino JSON-Logging
    TelemetryModule,    // OpenTelemetry (opt-in)
    NocoDBModule,       // @Global – NocoDB-Client
    AuthModule,         // JWT-Strategies + Guards
    PermissionsModule,  // RBAC + Rollen-Management
  ],
  controllers: [AppController, HealthController],
})
```

### 3.2 NocoDBModule (`@Global()`)

Zentraler Datenzugriffs-Layer. Stellt bereit:

- **NocoDBService**: Unified Service für Meta API v3 (Tabellen/Columns anlegen, listen) + Data API v3 (CRUD mit Filter/Sort/Pagination). Enthält client-seitiges Rate-Limiting (200ms = 5 req/s) und OTel-Tracing-Wrapper.
- **`BaseRepository<T>`**: Abstrakte Klasse mit typsicheren CRUD-Methoden + Pagination-Unterstützung (PageDto/PageMetaDto).
- **TableCatalogService**: Listet alle nicht-internen Tabellen (filtert `users, roles, user_roles, table_permissions`).
- **DatabaseInitializationService**: `OnModuleInit` – erstellt automatisch die 4 System-Tabellen und seedt Admin-Rolle + Default-User.
- **NocoDbContextMiddleware**: Reichert Request um `x-nocodb-user-id` und `x-request-id` Header an.

### 3.3 AuthModule

- **JwtStrategy** (Passport): Validiert Bearer-Token gegen `JWT_SECRET`, extrahiert `{ userId, username, roles }` aus JWT-Payload.
- **JwtAuthGuard**: Einfacher `AuthGuard('jwt')` – **ohne `@Public()`-Decorator-Support** (alle Endpoints erfordern Auth).
- **RolesGuard**: Rollenbasierte Autorisierung via `@Roles('admin')` Decorator.
- **BootstrapAdminService**: Einmalige Admin-Erstellung via `/bootstrap/admin` Endpoint mit Token-basierter Autorisierung (constant-time Vergleich).

### 3.4 PermissionsModule

Vollständiges RBAC-System auf Table-Ebene:

- **PermissionsService**: Lädt User-Permissions aus NocoDB-Tabellen (user → user_roles → roles → table_permissions), cached 5 Min.
- **PermissionsGuard**: Validiert `@RequirePermissions()` / `@RequireRead('table')` Decorator gegen berechnete Permissions.
- **PermissionsManagementService/Controller**: Admin-CRUD für Rollen, Table-Permissions, User-Role-Zuweisungen.
- **RolesService**: CRUD für Rollen (mit Validierung, Duplicate-Check).
- **UserRolesService**: Zuweisung/Entfernung von Rollen zu Benutzern.

### 3.5 TelemetryModule

- **Tracing**: Initialisierung von OpenTelemetry via `@opentelemetry/auto-instrumentations-node`.
- **TelemetryService**: Injectable Wrapper für benannte Spans mit Error-Handling.

---

## 4. Datenmodell (NocoDB System-Tabellen)

### 4.1 `users`
| Spalte | Typ | Zweck |
|--------|-----|-------|
| id | (autogen) | Primary Key |
| username | SingleLineText | Login-Name |
| email | Email | E-Mail |
| password_hash | LongText | bcrypt-Hash |
| is_active | Checkbox | Aktiv/Deaktiviert |

### 4.2 `roles`
| Spalte | Typ | Zweck |
|--------|-----|-------|
| id | (autogen) | Primary Key |
| role_name | SingleLineText | Rollenname (z.B. admin, editor) |
| description | LongText | Beschreibung |
| is_system_role | Checkbox | System-Schutz |

### 4.3 `user_roles` (Junction)
| Spalte | Typ | Zweck |
|--------|-----|-------|
| id | (autogen) | Primary Key |
| user | Link → users | Benutzer |
| role | Link → roles | Rolle |
| assigned_at | DateTime | Zeitpunkt der Zuweisung |

### 4.4 `table_permissions`
| Spalte | Typ | Zweck |
|--------|-----|-------|
| id | (autogen) | Primary Key |
| role | Link → roles | Rolle |
| table_name | SingleLineText | Ziel-Tabelle |
| can_create | Checkbox | CREATE-Berechtigung |
| can_read | Checkbox | READ-Berechtigung |
| can_update | Checkbox | UPDATE-Berechtigung |
| can_delete | Checkbox | DELETE-Berechtigung |

---

## 5. Request Pipeline (Detail)

1. **Helmet** – Setzt Security-Header (CSP, X-Frame-Options, etc.)
2. **express-rate-limit** – Globales Rate-Limiting (100 Requests/15 Min. pro IP)
3. **Pino Logger (nestjs-pino)** – JSON-Structured Logging, redacted `Authorization`/`Cookie`
4. **JwtAuthGuard** – Validiert `Authorization: Bearer <token>` gegen `JWT_SECRET`. Ohne gültigen Token → 401.
5. **NocoDbContextMiddleware** – Kopiert User-Context in `x-nocodb-user-id` Header
6. **PermissionsGuard** – Prüft `@RequirePermissions()` Decorator gegen Datenbank-Permissions
7. **Cache Interceptor** – Cached GET-Responses (5 Min. TTL, max 100 Items)
8. **Controller → Service → Repository → NocoDBService → HTTP → NocoDB**

---

## 6. Error Handling

- **Global Exception Filter** (`NocoDBExceptionFilter`) fängt alle Exceptions
- Einheitliches Antwortformat: `{ statusCode, timestamp, path, message }`
- HTTP-Exception-Filter für NestJS-eigene Exceptions
- Fallback für unbehandelte Fehler → 500 Internal Server Error

---

## 7. Testing

- **213 Unit-Tests** (Jest), ≥ 80% Coverage
- Coverage-Ziele: Statements ≥ 80%, Branches ≥ 80%, Functions ≥ 80%, Lines ≥ 80%
- Coverage-Excludes: `main.ts`, `app.module.ts`, `tracing.ts`, Specs, Test-Helper
- E2E-Tests: `test/app.e2e-spec.ts` (Supertest)
- Einzelne Specs für: Services, Guards, Decorators, Filter, Middleware, Repositories, DTOs

---

## 8. DevOps & Deployment

- **Docker**: `Dockerfile` (Multi-Stage) + `docker-compose.yml`
- **CI**: GitHub Actions – lint, test, coverage, build
- **Release**: GitHub Actions – Semantic Release mit `conventional-changelog`
- **Dokumentation**: VitePress in `/docs`, deployt als GitHub Pages
- **OpenAPI**: Generiertes `openapi.yaml` + Swagger UI unter `/api/docs`

---

## 9. Bewertung: Stärken

| Aspekt | Bewertung |
|--------|-----------|
| **Modularisierung** | Saubere NestJS-Module mit klaren Verantwortlichkeiten |
| **Typsicherheit** | TypeScript strict mode, class-validator/transformer für DTOs |
| **RBAC-System** | Table-Level CRUD Permissions, vollständig in NocoDB persistiert |
| **Auto-Provisioning** | DatabaseInitializationService erstellt Tabellen automatisch |
| **Caching** | Mehrschichtig: HTTP-Cache (5min), Permissions-Cache (5min), NocoDB-Rate-Limit |
| **Observability** | Pino-Logging + optionales OpenTelemetry-Tracing |
| **Testabdeckung** | 213 Tests, ≥ 80% Coverage |
| **Sicherheit** | Helmet, CORS, Rate-Limiting, bcrypt, constant-time Token-Vergleich |

---

## 10. Bewertung: Schwächen & Risiken

| # | Schwäche | Risiko | Priorität |
|---|----------|--------|-----------|
| 1 | **Kein `@Public()`-Decorator** – JwtAuthGuard hat keine Skip-Logik | Endpoints wie Login/Webhooks lassen sich nicht ohne Auth bereitstellen | Hoch |
| 2 | **Hardcodiertes Rate-Limit** (200ms) im NocoDBService | Nicht konfigurierbar, kann bei anderen NocoDB-Installationen zu langsam oder zu aggressiv sein | Mittel |
| 3 | **Default-Passwort `password123`** im DatabaseInitializationService | Sicherheitsrisiko, wenn das Seeding unkontrolliert in Production läuft | Hoch |
| 4 | **Seeding läuft bei jedem Start** – `onModuleInit` erstellt/seeded immer | Kann in Production zu unerwünschten Nebenwirkungen führen (z.B. User wird nicht nochmal erstellt, aber Lookups laufen immer) | Mittel |
| 5 | **Swagger UI nicht environment-geschützt** – `/api/docs` in `main.ts` ohne `NODE_ENV`-Check | Swagger-UI wäre in Production erreichbar (Exposure der API-Dokumentation) | Niedrig |
| 6 | **Keine XSS-Sanitierung** | Freitextfelder könnten XSS-Angriffe ermöglichen | Hoch |
| 7 | **Keine Retry-Logik** bei NocoDB-Upstream-Fehlern | Transiente Fehler (5xx, Timeouts) führen sofort zum Fehlschlag | Mittel |
| 8 | **Kein Circuit Breaker** | Bei anhaltenden NocoDB-Ausfällen kein Fail-Fast | Mittel |
| 9 | **Kein Audit-Logging** | Schreiboperationen (CUD) werden nicht mit User-ID geloggt | Mittel |
| 10 | **Kein Redis-Cache** | In-Memory-Cache skaliert nicht bei Multi-Instanz-Betrieb | Niedrig |
| 11 | **Keine Prometheus-Metrics** | Operatives Monitoring fehlt | Niedrig |
| 12 | **Keine Response-Kompression** | Größere Payloads werden unkomprimiert ausgeliefert | Niedrig |
| 13 | **Pagination fehlt auf Admin-Endpoints** | `PermissionsManagementController` listet ohne Pagination | Mittel |
| 14 | **Keine E2E-Tests für Auth-Flow** | Kritischer Auth-Pfad nicht integriert getestet | Mittel |
| 15 | **CORS_ORIGINS muss explizit gesetzt werden** | Fehlende Konfiguration führt zu undefiniertem Verhalten | Hoch |

---

## 11. Data Flow Diagram: Permission Check

```
Request mit JWT
       │
       ▼
JwtAuthGuard ────▶ JwtStrategy.validate()
       │              │
       │              └── extrahiere { userId, username, roles }
       │
       ▼
NocoDbContextMiddleware
       │
       ▼
PermissionsGuard.canActivate()
       │
       ├── lese @RequirePermissions() Decorator
       │
       └──▶ PermissionsService.canUserPerformAction(userId, table, action)
                 │
                 ├── Cache-Hit? → return cached
                 │
                 └──▶ NocoDB: users table → find user
                         │
                         ├── NocoDB: user_roles → find role assignments
                         │
                         ├── NocoDB: roles → get role names
                         │
                         ├── NocoDB: table_permissions → get permissions
                         │
                         └── Aggregate → Cache set (5 Min.)
```

---

## 12. Abhängigkeiten (Package.json)

| Kategorie | Packages |
|-----------|----------|
| **NestJS Core** | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` |
| **Auth** | `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` |
| **Config** | `@nestjs/config` |
| **Caching** | `@nestjs/cache-manager`, `cache-manager` |
| **Logging** | `nestjs-pino`, `pino-http`, `winston` (nest-winston) |
| **NocoDB** | `nocodb-sdk` |
| **HTTP** | `axios` |
| **Security** | `helmet`, `express-rate-limit`, `class-validator`, `class-transformer` |
| **Tracing** | `@opentelemetry/api`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http` |
| **Dokumentation** | `@nestjs/swagger`, `swagger-ui-express` |
| **Dev** | `jest`, `ts-jest`, `supertest`, `eslint`, `prettier`, `vitepress`, `vitepress-openapi` |
