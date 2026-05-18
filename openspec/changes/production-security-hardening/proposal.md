## Why

Die Code-Analyse hat mehrere Sicherheitslücken und Konfigurationsrisiken identifiziert, die vor dem ersten Production-Deployment adressiert werden müssen:

1. **`@Public()`-Decorator fehlt** – JwtAuthGuard erlaubt keinen Skip; Endpoints wie Login, Webhooks oder Public-Health-Seiten lassen sich nicht ohne Auth bereitstellen.
2. **Default-Passwort `password123`** – DatabaseInitializationService seedt einen Admin-User mit hartcodiertem Passwort. In Production ein gravierendes Sicherheitsrisiko.
3. **Seeding läuft bei jedem Start** – `onModuleInit` führt Lookups und ggf. Creates immer aus, obwohl das nur beim ersten Start nötig ist.
4. **Swagger UI nicht environment-geschützt** – `/api/docs` ist ohne `NODE_ENV`-Check in Production erreichbar.
5. **Rate-Limiting im NocoDBService hardcodiert** (200ms) – nicht per ENV konfigurierbar.
6. **CORS_ORIGINS muss explizit gesetzt werden** – Fehlende Konfiguration kann zu undefiniertem Verhalten führen.

## What Changes

- `@Public()`-Decorator im JwtAuthGuard unterstützen (via Reflector-Metadaten)
- Bootstrap-Seeding: sicheres Passwort erzwingen + `onModuleInit` nur beim ersten Start ausführen (idempotent)
- Swagger UI in `main.ts` per `NODE_ENV` schützen
- `NOCODB_RATE_LIMIT_MS` ENV-Variable für konfigurierbares Rate-Limiting
- `CORS_ORIGINS`-Validierung beim Start (App wirft Fehler, wenn nicht gesetzt)

## Capabilities

### New Capabilities
- `production-security-enforcement`: Bündelt alle Security-Hardening-Maßnahmen für den Production-Betrieb.

### Modified Capabilities
- `JwtAuthGuard` – erweiterte Logik für `@Public()`-Skip
- `DatabaseInitializationService` – idempotentes, sicheres Bootstrap
- `NocoDBService` – konfigurierbares Rate-Limiting

## Impact

- API-Contract: Keine Breaking Changes
- Konfiguration: Neue ENV-Variablen sind optional (Default-Werte vorhanden)
- Sicherheit: Deutlich reduziertes Risiko bei Deployment-Vergessen
