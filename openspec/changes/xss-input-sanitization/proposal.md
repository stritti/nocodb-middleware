## Why

Aktuell werden Freitextfelder (username, email, description, etc.) ohne Sanitization in NocoDB gespeichert und über die Middleware ausgeliefert. Ohne XSS-Eingabe-Sanitierung können bösartige Nutzer HTML/JavaScript in Textfelder einschleusen, das beim Auslesen über die API im Browser ausgeführt wird. Dies ist ein kritisches Sicherheitsrisiko für alle Clients, die Daten über die Middleware beziehen.

Das Projekt verwendet bereits Helmet für Ausgabe-Header, aber die Input-Sanitization auf Anwendungsebene fehlt.

## What Changes

- Integration einer Sanitization-Library (z.B. `sanitize-html`) als Pipe oder Interceptor
- Automatische Bereinigung von Freitextfeldern bei Create/Update-Operationen
- Konfigurierbare Allowlist für erlaubte HTML-Tags (default: keine)
- Unit-Tests für die Sanitization-Pipe

## Capabilities

### New Capabilities
- `xss-sanitization-layer`: Bereinigt Freitextfelder in eingehenden Requests vor dem Speichern in NocoDB, konfigurierbar über Allowlist.

### Modified Capabilities
- Keine.

## Impact

- Betrifft alle Create/Update-Endpoints der Middleware
- Neue Abhängigkeit: `sanitize-html` (oder gleichwertige Bibliothek)
- Zusätzliche Latenz durch Sanitization (vernachlässigbar <1ms)
- Kein Bruch des API-Contracts – gespeicherte Daten werden sicherer
