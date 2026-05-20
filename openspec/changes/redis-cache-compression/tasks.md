## 1. Redis-Cache Integration

- [ ] 1.1 `ioredis` und `cache-manager-redis-yet` installieren
- [ ] 1.2 `REDIS_URL` in Config einlesen (optional)
- [ ] 1.3 `AppModule`: CacheModule per ConfigService konfigurieren (Redis oder in-Memory)
- [ ] 1.4 Cache-Key-Präfix `nocodb-middleware:` festlegen
- [ ] 1.5 Fallback: Wenn REDIS_URL nicht gesetzt → in-Memory

## 2. Response-Kompression

- [ ] 2.1 `compression` als Dependency installieren
- [ ] 2.2 Compression-Middleware in `main.ts` registrieren
- [ ] 2.3 Konfiguration: Threshold 1KB, Level 6
- [ ] 2.4 ENV-Schalter: `COMPRESSION_ENABLED` (default true), `COMPRESSION_LEVEL`

## 3. Tests & Dokumentation

- [ ] 3.1 Spec: CacheManager verwendet Redis wenn REDIS_URL gesetzt
- [ ] 3.2 Spec: CacheManager verwendet in-Memory wenn REDIS_URL nicht gesetzt
- [ ] 3.3 Env-Beispiel um REDIS_URL und COMPRESSION_* ergänzen
