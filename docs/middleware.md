# Middleware Dokumentation

## Überblick

Die Middleware-Schicht ist global im `NocoDBModule` registriert (`src/nocodb/nocodb.module.ts`).

## Komponenten

### 1) Logging Middleware
- Datei: `src/nocodb/middleware/logging.middleware.ts`
- Zweck: Request-/Response-Logging mit Laufzeitinformationen.

### 2) Rate Limit Middleware
- Datei: `src/nocodb/middleware/rate-limit.middleware.ts`
- Zweck: Schutz vor Missbrauch/Spitzenlast.

### 3) NocoDB Context Middleware
- Datei: `src/nocodb/middleware/nocodb-context.middleware.ts`
- Zweck: Request-Kontext für Downstream-Verarbeitung.
- Enthält u. a.:
  - `x-request-id` (generiert falls nicht vorhanden)
  - Benutzerkontext-Header

## Registrierung

Alle drei Middlewares sind aktuell für `*`-Routen registriert.

## Geplante Schärfung (OpenSpec)

- Konsistente Request-Traceability als operatives Muss
- Restriktive, konfigurierbare CORS-Policy (nicht global permissiv)
