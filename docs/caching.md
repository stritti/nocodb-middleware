# Caching

## Überblick

Caching basiert auf `@nestjs/cache-manager` mit In-Memory-Store.

## Komponenten

### `NocoDBCacheService`
- Datei: `src/nocodb/cache/nocodb-cache.service.ts`
- Wrapper für `get/set/del`.

### `CacheInterceptor`
- Datei: `src/nocodb/interceptors/cache.interceptor.ts`
- Cacht nur `GET`-Requests.
- Aktuelle Default-TTL im Interceptor: 60 Sekunden.

## Aktueller Einsatz

- Cache-Infrastruktur ist vorhanden.
- Permissions-Service nutzt zusätzlich eigenen In-Memory-Cache mit TTL für Berechtigungsauflösung.

## Geplante Schärfung (OpenSpec)

- Endpunkt-spezifische Cache-Strategie statt pauschaler Defaults
- Klare Invalidierung bei Rechtemutationen
- Operative Metriken für Cache-Hit/Miss-Verhalten
