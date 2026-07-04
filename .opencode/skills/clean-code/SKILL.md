---
name: Clean Code (NocoDB Middleware)
version: 1.0.0
description: Project-specific clean code standards derived from systematic review of the NocoDB middleware codebase
updated: 2026-07-04
---

# Clean Code — NocoDB Middleware

Project-spezifische Clean Code Standards, abgeleitet aus der systematischen Analyse des gesamten Codebase.

## 🔴 Phase 0: CI-Check vor dem Commit

Bevor Änderungen committed werden, **muss** lokal laufen:

```bash
npm run lint          # ESLint — keine errors
npm run format:check  # Prettier — alle Dateien formatiert
npm run build         # TypeScript Compiler — keine errors
npx jest --no-coverage # 291 Tests, 38 Suites — alle grün
```

**Regel**: Ein Commit, der CI rot macht, wird erst gemergt wenn alle Checks grün sind.

---

## 🧠 Grundprinzipien

### 1. Type Safety First

**Kein `any`** — außer in absoluten Ausnahmefällen mit begründetem Kommentar.

```typescript
// ❌ Schlecht
async getTableMeta(tableId: string): Promise<any>

// ✅ Gut
async getTableMeta(tableId: string): Promise<NocoTableMeta>
```

**Regeln**:
- Rückgabetypen von Service-Methoden müssen explizit sein
- `{} as any` ist verboten — Type Assertion nur mit konkretem Ziel-Typ
- Für dynamische Data-API-Records: `unknown` statt `any` verwenden (zwingt Consumer zur Validierung)
- Neue Interfaces in `nocodb.types.ts` oder lokal beim Consumer definieren

### 2. Named Constants statt Magic Values

Jeder numerische oder string-Literal-Wert, der kein offensichtlicher Parameter ist, gehört in eine Konstante.

```typescript
// ❌ Schlecht
setTimeout(() => this.refresh(), 60 * 1000);

// ✅ Gut
const CACHE_REFRESH_INTERVAL_MS = 60_000;
setTimeout(() => this.refresh(), CACHE_REFRESH_INTERVAL_MS);
```

**Benennung**: `UPPER_SNAKE_CASE` mit Einheitssuffix (`_MS`, `_SECONDS`, `_MINUTES`, `_BYTES`).

### 3. DRY — Keine Duplikate

Patterns, die zweimal oder öfter vorkommen, gehören in ein Shared Module:

- **`extractNumericId`**: Nutze die Version aus `src/common/utils/nocodb-utils.ts`, nicht duplizieren
- **API-Pfad-Konstanten**: Alle NocoDB API-Pfade über `RECORDS_PATH()`, `TABLE_META_PATH()`, etc. aus `nocodb.service.ts` referenzieren
- **try/catch + logger.error + rethrow**: Wenn dieses Pattern nötig ist, nicht 25x duplizieren — über einen Interceptor oder Decorator lösen

### 4. Single Responsibility

Wenn eine Service-Klasse > 300 Zeilen hat oder mehrere API-Domänen bedient, aufteilen.

**Kandidaten**:
- `NocoDBService`: Meta API vs Data API trennen (separater PR geplant)
- `DatabaseInitializationService`: table creation + column mgmt + seeding trennen

### 5. Error Handling — Keine silent Catches

```typescript
// ❌ Schlecht — Fehler werden verschluckt
try { ... } catch {}

// ✅ Gut — Loggen und kontrolliert behandeln
try { ... } catch (error: unknown) {
  this.logger.error('Kontext', error);
  throw error; // oder handledException, je nach Fall
}
```

### 6. Decorators für Cross-Cutting Concerns

Statt rohem `SetMetadata`:

```typescript
// ❌ Schlecht
@SetMetadata('roles', [UserRole.ADMIN])

// ✅ Gut
@Roles(UserRole.ADMIN)
```

Nutze den vorhandenen `@Roles()` Decorator aus `src/common/decorators/roles.decorator.ts`.

---

## 📐 Modul-Spezifische Standards

### Auth Module
- DTOs: Alle Eingaben mit `class-validator` validieren
- `@Exclude()` für sensitive Felder wie Passwort/refreshToken
- Unterschiedliche Password-Policies in DTOs vermeiden — lieber eine einheitliche Regel

### NocoDB Module
- **Typen**: Neue Typen in `src/nocodb/nocodb.types.ts` definieren
- **Pfade**: Niemals hardcodierte API-Pfade — immer die Pfadkonstanten nutzen
- **Cache**: TTL-Werte über `CacheTTL`-Enum aus `cache.interceptor.ts` referenzieren
- **Rate-Limiting**: Limits über `RATE_LIMIT_*`-Konstanten aus `rate-limit.middleware.ts`

### Permissions Module
- Caching-TTL als benannte Konstante (`PERMISSIONS_CACHE_TTL_MS`)
- Return-Typen explizit — kein `any`

---

## 🔍 Code Review Checkliste

### Structure
- [ ] Keine `any`-Typen (außer begründete Ausnahme)
- [ ] Keine Magic Numbers/Strings
- [ ] `{} as any` nicht verwendet
- [ ] Keine silent Catches (`catch {}`)
- [ ] API-Pfad-Konstanten genutzt statt hardcodiert
- [ ] `@Roles()` Decorator statt `@SetMetadata('roles', ...)`

### CI Readiness
- [ ] `npm run lint` — keine Errors
- [ ] `npm run format:check` — alle Dateien OK
- [ ] `npm run build` — kompiliert fehlerfrei
- [ ] `npx jest --no-coverage` — 291 Tests grün
- [ ] Keine neuen TS6059 oder TS2304 Errors
- [ ] OpenAPI Spec aktuell (`npm run generate:openapi`)

### Maintainability
- [ ] Service-Klassen < 300 Zeilen (oder mit Kommentar, warum größer)
- [ ] Keine duplizierte Logik
- [ ] try/catch mit aussagekräftigem Logging + kontrolliertem Fehlerweitwurf
- [ ] DTO-Validierung konsistent zwischen ähnlichen DTOs

---

## ⚡ Schnell-Befehle

```bash
# Prüfen vor Commit
npm run lint && npm run format:check && npm run build && npx jest --no-coverage

# Formatieren
npm run format

# OpenAPI neu generieren
npm run generate:openapi

# Coverage Report
npm run test:cov
```
