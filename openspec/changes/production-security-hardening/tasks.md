## 1. @Public()-Decorator

- [ ] 1.1 `IS_PUBLIC_KEY` Konstante und `@Public()` Decorator erstellen
- [ ] 1.2 `JwtAuthGuard` erweitern: `canActivate` prüft `isPublic` Metadata
- [ ] 1.3 Specs für `JwtAuthGuard` mit/ohne `@Public()`-Decorator

## 2. Sicheres Bootstrap-Seeding

- [ ] 2.1 `BOOTSTRAP_ADMIN_PASSWORD` ENV-Variable in Config einlesen
- [ ] 2.2 DatabaseInitializationService: Fallback-Logik für fehlendes Passwort
- [ ] 2.3 Idempotenz: Nur seeden, wenn Tabellen noch leer sind
- [ ] 2.4 Specs für sicheres Bootstrap

## 3. Swagger-Environment-Schutz

- [ ] 3.1 `main.ts`: Swagger-Setup per `NODE_ENV !== 'production'` schützen
- [ ] 3.2 Optional: `SWAGGER_ENABLED=true`-Override für Staging

## 4. Konfigurierbares Rate-Limit

- [ ] 4.1 `NOCODB_RATE_LIMIT_MS` in `.env.example` dokumentieren
- [ ] 4.2 `src/config/nocodb.config.ts` um die Property erweitern
- [ ] 4.3 `NocoDBService` lädt `rateLimitMs` aus ConfigService

## 5. CORS-Validierung

- [ ] 5.1 App-Start prüft `CORS_ORIGINS` und logged Warnung, wenn nicht gesetzt
- [ ] 5.2 Optionales Strict-Mode: `CORS_REQUIRED=true` lässt App ohne CORS-Konfiguration nicht starten
