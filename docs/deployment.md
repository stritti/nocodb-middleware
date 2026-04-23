# Deployment

## Überblick

Das Repository bringt bereits `Dockerfile`, `docker-compose.yml`, Health Check, Logging, Swagger und optionale OpenTelemetry-Konfiguration mit.
Damit ist ein lokales Setup schnell möglich.
Für produktive Umgebungen solltest du aber einige Punkte bewusst entscheiden.

## Lokaler Start mit Docker Compose

### Voraussetzungen

- Docker
- Docker Compose
- gültige `.env`

### Beispiel

```bash
cp .env.example .env
docker compose up --build
```

Danach:

- Middleware auf `http://localhost:3000`
- NocoDB auf `http://localhost:8080`
- Swagger UI auf `http://localhost:3000/api/docs`
- Health Probe auf `http://localhost:3000/api/health`

## Wichtige Umgebungsvariablen

| Variable                      | Zweck                          |
| ----------------------------- | ------------------------------ |
| `NOCODB_API_URL`              | URL der NocoDB-Instanz         |
| `NOCODB_API_TOKEN`            | Backend-Secret für NocoDB      |
| `NOCODB_BASE_ID`              | Base ID für Meta API v3        |
| `JWT_SECRET`                  | Secret zur JWT-Validierung     |
| `AUTH_PROVIDER`               | `local` oder `external`        |
| `EXTERNAL_JWT_SECRET`         | JWT Secret für externen IdP    |
| `EXTERNAL_JWT_ISSUER`         | erwarteter JWT Issuer          |
| `EXTERNAL_JWT_AUDIENCE`       | erwartete JWT Audience         |
| `BOOTSTRAP_ADMIN_PASSWORD`    | Initialpasswort für Seed-Admin |
| `CORS_ORIGINS`                | erlaubte Browser-Origin-Liste  |
| `PORT`                        | Port der Middleware            |
| `LOG_DIR`                     | Ziel für Log-Dateien           |
| `OTEL_ENABLED`                | Tracing an oder aus            |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP-Ziel für Spans            |

### IdP-Switch Rollout (`local` <-> `external`)

1. Secrets für Zielprovider bereitstellen (`JWT_SECRET` oder `EXTERNAL_JWT_SECRET`).
2. In Staging `AUTH_PROVIDER` umstellen und Health + Auth-Endpunkte testen.
3. Token-Claims (`sub`, `roles`, `scope`) gegen RBAC-Guard-Entscheidungen verifizieren.
4. Bei Problemen auf vorherigen Provider zurückschalten und Deployment neu starten.

## Reverse Proxy

Für produktive Deployments ist ein Reverse Proxy vor der Middleware sinnvoll.

Ziele:

- TLS-Terminierung
- HTTP nach HTTPS
- Host-Routing
- optional Auth-Gateway oder BFF davor
- Logging und Request-IDs konsistent durchreichen

## Produktionscheckliste

### Netzwerk und Exposure

- [ ] Middleware nicht unnötig direkt öffentlich exponieren
- [ ] `/api` nur bewusst öffentlich oder intern bereitstellen
- [ ] Admin-Endpunkte separat absichern
- [ ] `CORS_ORIGINS` auf konkrete Domains beschränken

### Container und Runtime

- [ ] `.env` nicht ins Image kopieren
- [ ] Secrets über Runtime oder Secret Store injizieren
- [ ] Neustartstrategie definieren
- [ ] Volumes für Logs und NocoDB-Daten sauber planen

### Beobachtbarkeit

- [ ] `/api/health` in Monitoring integrieren
- [ ] Logs zentral auswerten
- [ ] OpenTelemetry aktivieren, wenn Tracing benötigt wird
- [ ] Alerts für 5xx, 401/403-Spitzen und Upstream-Fehler definieren

### Skalierung

Der aktuelle Cache ist In-Memory.
Für mehrere Instanzen gilt:

- Cache ist nicht geteilt
- Rate Limits sind pro Instanz
- Sticky Sessions lösen das Grundproblem nicht

Für horizontale Skalierung ist mittelfristig Redis oder ein vergleichbarer zentraler Cache sinnvoll.

## Dockerfile-Einordnung

Das vorhandene `Dockerfile` nutzt einen Multi-Stage-Build.
Das ist für den Einstieg gut.
Für härtere Produktionsanforderungen kannst du zusätzlich prüfen:

- non-root user
- Healthcheck im Container
- read-only filesystem
- minimale Laufzeitrechte
- Image Scanning in CI

## VPS-Deployment

Ein typisches Setup:

1. Reverse Proxy mit TLS
2. Middleware-Container
3. NocoDB separat
4. Secret-Verwaltung außerhalb des Repos
5. Backup-Strategie für NocoDB-Daten
6. Monitoring für Middleware und NocoDB

## CI/CD

Im Repository sind GitHub Actions für CI und Release vorhanden.
Vor produktiver Nutzung sollte CI mindestens prüfen:

- Build
- Unit Tests
- E2E Tests
- Linting
- OpenAPI-Generierung
- Container- oder Dependency-Scanning

## Empfehlung

Für den Start:

- Docker Compose lokal
- danach Reverse Proxy plus Container auf VPS

Für ernsthaften Produktivbetrieb:

- BFF oder Auth-Gateway vor der Middleware
- zentrale Secret-Verwaltung
- Monitoring und Alerting
- Plan für Multi-Instance-Betrieb
