## Why

Die Code-Analyse hat mehrere Sicherheitslücken und Konfigurationsrisiken identifiziert, die vor dem ersten Production-Deployment adressiert werden müssen:

1. **`@Public()`-Decorator fehlt & kein globaler JwtAuthGuard** – JwtAuthGuard ist nicht global registriert; jeder Controller muss `@UseGuards(JwtAuthGuard)` manuell setzen. Neue Endpoints sind standardmäßig ungeschützt, und `@Public()` kann nicht wirken.
2. **Default-Passwort `password123`** – DatabaseInitializationService seedt einen Admin-User mit hartcodiertem Passwort. In Production ein gravierendes Sicherheitsrisiko.
3. **Seeding läuft bei jedem Start** – `onModuleInit` führt Lookups und ggf. Creates immer aus, obwohl das nur beim ersten Start nötig ist.
4. **Swagger UI nicht environment-geschützt** – `/api/docs` ist ohne `NODE_ENV`-Check in Production erreichbar.
5. **Rate-Limiting im NocoDBService hardcodiert** (200ms) – nicht per ENV konfigurierbar.
6. **CORS_ORIGINS muss explizit gesetzt werden** – Fehlende Konfiguration kann zu undefiniertem Verhalten führen.

## What Changes

- `JwtAuthGuard` global als `APP_GUARD` in AppModule registrieren (damit alle Endpoints standardmäßig geschützt sind)
- `@Public()`-Decorator im JwtAuthGuard unterstützen (via Reflector-Metadaten) – nur wirksam, weil der Guard global ist
- Bestehende `@UseGuards(JwtAuthGuard)`-Dekorationen in Controllern auf die verbleibenden Guards reduzieren (z. B. `@UseGuards(PermissionsGuard)` statt `@UseGuards(JwtAuthGuard, PermissionsGuard)`, da JwtAuthGuard jetzt global läuft)
- Bootstrap-Seeding: sicheres Passwort erzwingen + `onModuleInit` nur beim ersten Start ausführen (idempotent)
- Swagger UI in `main.ts` per `NODE_ENV` schützen
- `NOCODB_RATE_LIMIT_MS` ENV-Variable für konfigurierbares Rate-Limiting
- `CORS_ORIGINS`-Validierung beim Start (App wirft Fehler, wenn nicht gesetzt)

## Capabilities

### New Capabilities
- `production-security-enforcement`: Bündelt alle Security-Hardening-Maßnahmen für den Production-Betrieb.

### Modified Capabilities
- `AppModule` – globale Registrierung von `JwtAuthGuard` als `APP_GUARD`
- `JwtAuthGuard` – erweiterte Logik für `@Public()`-Skip; kann jetzt auch ohne `@UseGuards`-Dekoration wirken
- `DatabaseInitializationService` – idempotentes, sicheres Bootstrap
- `NocoDBService` – konfigurierbares Rate-Limiting

## Impact

- API-Contract: Keine Breaking Changes (globaler Guard ändert nur das Default-Verhalten; alle bisher geschützten Endpoints bleiben geschützt)
- Konfiguration: Neue ENV-Variablen sind optional (Default-Werte vorhanden)
- Sicherheit: Deutlich reduziertes Risiko bei Deployment-Vergessen; neue Endpoints sind standardmäßig geschützt
- Controller: `@UseGuards(JwtAuthGuard, PermissionsGuard)` muss zu `@UseGuards(PermissionsGuard)` werden, da JwtAuthGuard jetzt global läuft
