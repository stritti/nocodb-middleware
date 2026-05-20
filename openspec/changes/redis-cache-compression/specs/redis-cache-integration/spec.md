## ADDED Requirements

### Requirement: Redis als Cache-Store
Die Middleware SHALL `@nestjs/cache-manager` mit Redis als Cache-Store betreiben können, wenn `REDIS_URL` konfiguriert ist.

#### Scenario: Redis-Cache mit gültiger URL
- **GIVEN** `REDIS_URL=redis://localhost:6379` ist gesetzt
- **WHEN** die App startet
- **THEN** verwendet der CacheManager Redis als Store

#### Scenario: Fallback auf in-Memory
- **GIVEN** `REDIS_URL` ist nicht gesetzt
- **WHEN** die App startet
- **THEN** verwendet der CacheManager den in-Memory-Store

### Requirement: Cache-Key-Präfix
Die Middleware SHALL alle Cache-Keys mit dem Präfix `nocodb-middleware:` versehen, um Konflikte mit anderen Anwendungen im selben Redis zu vermeiden.

#### Scenario: Prefix wird angewendet
- **GIVEN** Redis ist als Cache-Store konfiguriert
- **WHEN** ein Cache-Eintrag mit Key `permissions:42` gespeichert wird
- **THEN** lautet der tatsächliche Redis-Key `nocodb-middleware:permissions:42`
