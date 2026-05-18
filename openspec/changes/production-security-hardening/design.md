## Context

Die Middleware hat mehrere Sicherheitslücken, die durch inkrementelle Entwicklung entstanden sind. Keine dieser Lücken ist einzeln kritisch, aber in Summe stellen sie ein signifikantes Risiko für den Production-Betrieb dar.

## Goals / Non-Goals

**Goals:**
- `@Public()`-Skip im JwtAuthGuard implementieren
- Bootstrap-Seeding: sicheren Default erzwingen + nur beim ersten Start ausführen
- Swagger-UI in Production deaktivieren
- NocoDB-Rate-Limit konfigurierbar machen (`NOCODB_RATE_LIMIT_MS`, Default 200)
- `CORS_ORIGINS`-Validierung beim App-Start

**Non-Goals:**
- Keine Änderung der Auth-Architektur
- Kein Identity-Provider-Bau (JWT wird weiterhin extern ausgestellt)
- Kein komplettes Re-Design des Seedings

## Decisions

### @Public()-Decorator
- Reflector-Metadaten-Key `isPublic` im JwtAuthGuard auswerten
- `Public()` Decorator analog zum bestehenden Pattern (siehe `@Roles`-Decorator)
- Standardverhalten bleibt: alle Endpoints sind geschützt

### Sicheres Bootstrap
- `BOOTSTRAP_ADMIN_PASSWORD` ENV-Variable für das Admin-Passwort
- Wenn nicht gesetzt → Warnung + Fallback auf generiertes Passwort (wird ins Log geschrieben)
- Idempotenz-Prüfung: Wenn Admin-User bereits existiert → kein Create mehr
- `onModuleInit` führt Seeding nur aus, wenn Tabellen noch nicht initialisiert sind

### Swagger-Umgebungs-Schutz
- `if (process.env.NODE_ENV !== 'production')` um die Swagger-Setup-Logik in `main.ts`

### Konfigurierbares Rate-Limit
- `NOCODB_RATE_LIMIT_MS` (Default: `200`) in `env.example` dokumentieren
- Im NocoDBService `this.rateLimitMs` über ConfigService laden

### CORS-Validierung
- Beim App-Start prüfen, ob `CORS_ORIGINS` gesetzt ist
- Wenn nicht → Log-Warnung oder App-Start abbrechen (per ENV umschaltbar)

## Risks / Trade-offs

- [Risk] @Public()-Skip könnte versehentlich zu ungeschützten Endpoints führen → Standard bleibt "alles geschützt", @Public() muss explizit gesetzt werden
- [Risk] Swagger-Deaktivierung erschwert Debugging in Production → optional via `SWAGGER_ENABLED=true` overridebar
- [Risk] CORS-Validierung könnte Deployment blockieren → Warnung reicht, Start nicht blockieren
