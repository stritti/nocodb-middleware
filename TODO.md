# TODO: NocoDB Middleware

> Vollständige Analyse, Bewertungsmatrix und Begründung der Priorisierung:
> **[docs/product-readiness.md](docs/product-readiness.md)**

---

## Status-Legende

- [x] Abgeschlossen
- [ ] Offen / geplant
- [!] Blockiert / Problem

---

## ✅ Abgeschlossen

Alle Phasen 1–11 der ursprünglichen Checkliste sind implementiert:

- [x] NocoDB-Integration (Meta API v3 + Data API v3)
- [x] JWT-Authentifizierung (Passport-JWT)
- [x] Role-Based Access Control (RBAC – Permissions Guards & Decorators)
- [x] Middleware-Stack (Logging, Rate Limiting, Context)
- [x] Repository-Pattern (`BaseRepository`, `ExampleRepository`)
- [x] Caching-Layer (in-memory, 60 s TTL, Permissions 5 min)
- [x] Error-Handling (Custom Exceptions, Global Filter)
- [x] Swagger UI (`/api`) + statisches `openapi.yaml` (auto-regeneriert via CI)
- [x] Health Check (`/health`)
- [x] Unit-Tests (213 Tests, ≥ 80 % Coverage)
- [x] Docker-Support (`Dockerfile` + `docker-compose.yml`)
- [x] Graceful Shutdown
- [x] OpenTelemetry Tracing (opt-in via `OTEL_ENABLED=true`)
- [x] Security-Headers (`helmet`)
- [x] CORS-Konfiguration (via `CORS_ORIGINS` Env-Variable)
- [x] `CHANGELOG.md` (via `conventional-changelog`, automatisch bei jedem Release)
- [x] Strukturiertes Logging (`nestjs-pino` + `pino-http`, JSON in Production, pretty-print in Dev)

---

## 🔴 Priorität 1 – Vor dem ersten Produktions-Deployment

> Details: [docs/product-readiness.md – Abschnitt 8](docs/product-readiness.md#8-prioritised-action-plan)

- [x] **Datenbankschema dokumentieren** – `docs/database-schema.md` mit allen benötigten
  NocoDB-Tabellen (`users`, `user_roles`, `roles`, `table_permissions`), Spalten und
  Beziehungen erstellen.
  _(vgl. [product-readiness.md §3.7](docs/product-readiness.md#37-nocodb-table-setup--bootstrap-documentation))_

- [ ] **XSS-Eingabe-Sanitierung** – `sanitize-html` auf Freitextfelder anwenden, bevor
  Daten in NocoDB gespeichert werden.
  _(vgl. [product-readiness.md §3.3](docs/product-readiness.md#33-security--input-sanitization))_

- [ ] **`CORS_ORIGINS` in allen Umgebungen setzen** – Sicherstellen, dass in jedem
  Deployment-Environment (Staging, Production) eine explizite Allowlist konfiguriert ist.
  _(vgl. [product-readiness.md §3.4](docs/product-readiness.md#34-security--cors))_

---

## 🟡 Priorität 2 – Kurzfristig (nächster Sprint)

> Details: [docs/product-readiness.md – Abschnitt 8](docs/product-readiness.md#8-prioritised-action-plan)

- [ ] **Retry-Logik** – `axios-retry` mit exponentiellem Back-off für transiente
  NocoDB-Fehler (5xx, Netzwerk-Timeouts) hinzufügen.
  _(vgl. [product-readiness.md §3.1](docs/product-readiness.md#31-resilience))_

- [ ] **E2E-Tests für Auth-Flow** – JWT-Guard-Tests und Permissions-Tests zum E2E-Test-Suite
  hinzufügen.
  _(vgl. [product-readiness.md §4.5](docs/product-readiness.md#45-e2e-tests))_

- [ ] **Pagination auf Admin-Endpoints** – `PageOptionsDto` / `PageDto` auf alle
  List-Endpoints in `PermissionsManagementController` anwenden.
  _(vgl. [product-readiness.md §3.6](docs/product-readiness.md#36-pagination--missing-on-admin-endpoints))_

---

## 🟢 Priorität 3 – Mittelfristig (nächstes Release)

> Details: [docs/product-readiness.md – Abschnitt 8](docs/product-readiness.md#8-prioritised-action-plan)

- [ ] **Circuit-Breaker** – `opossum` oder ähnliches integrieren, um bei anhaltenden
  NocoDB-Ausfällen schnell zu versagen (fail-fast).
  _(vgl. [product-readiness.md §3.1](docs/product-readiness.md#31-resilience))_

- [ ] **Audit-Logging** – Alle Schreiboperationen (Create/Update/Delete) mit User-ID
  protokollieren.
  _(vgl. [product-readiness.md §5 – Security Checklist](docs/product-readiness.md#6-security-checklist))_

- [ ] **Prometheus-Metrics** – `/metrics`-Endpoint für operatives Monitoring bereitstellen.
  _(vgl. [product-readiness.md §5 – Performance](docs/product-readiness.md#7-performance-checklist))_

- [ ] **Redis-Cache** – In-Memory-Cache durch Redis ersetzen (notwendig für
  Multi-Instanz-Betrieb).
  _(vgl. [product-readiness.md §7 – Performance Checklist](docs/product-readiness.md#7-performance-checklist))_

- [ ] **Response-Kompression** – `compression`-Middleware (gzip/brotli) aktivieren.

---

## 💡 Optional / Langfristig

- [ ] **Webhooks** – NocoDB-Webhook-Handler mit Signatur-Validierung implementieren.
- [ ] **CLI-Tools** – NestJS-CLI-Commands für NocoDB-Operationen.
- [ ] **Lazy-Loading** – Module lazy laden, um Startup-Zeit zu reduzieren.

---

## Ressourcen

- 📄 [Product Readiness Analysis](docs/product-readiness.md)
- 📖 [NocoDB SDK Dokumentation](https://docs.nocodb.com/developer-resources/sdk)
- 📖 [Nest.js Dokumentation](https://docs.nestjs.com)

