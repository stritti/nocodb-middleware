## Context

Die Middleware validiert Inputs via `class-validator` (Typen, Formate), aber nicht auf XSS. Freitext-Felder wie `username`, `description`, `role_name`, `table_name` können HTML/JavaScript enthalten. Bei Auslieferung über die API (z.B. an ein SPA) könnte dieses im Browser ausgeführt werden.

Die Sanitization soll als globaler Pipe-Mechanismus oder als dedizierter Interceptor implementiert werden, der vor dem Speichern in NocoDB greift.

## Goals / Non-Goals

**Goals:**
- XSS-Sanitization für alle Textfelder in Create/Update-Payloads
- Konfigurierbare Allowlist für erlaubte HTML-Tags (Standard: keine)
- Unit-Tests mit bekannten XSS-Vektoren
- Minimaler Performance-Overhead (<1ms pro Request)

**Non-Goals:**
- Keine Änderung der bestehenden Validierungs-Logik (class-validator bleibt)
- Keine Sanitization von Output-Daten (Helmet schützt auf HTTP-Ebene)
- Kein CSP-Management (bereits durch Helmet abgedeckt)

## Decisions

- **Bibliothek**: `sanitize-html` (etabliert, aktiv gewartet, 4M+ Wochen-Downloads)
- **Implementierung als globaler Pipe**: Ein `XssSanitizationPipe` wird global registriert und bereinigt alle String-Felder in DTOs rekursiv
- **Allowlist-Konfiguration via ENV**: `XSS_ALLOWED_TAGS` (Komma-separiert, z.B. `b,i,a`) – leer = keine HTML-Tags erlaubt
- **Kein `stripHtml` pur**: `sanitize-html` mit restriktiven Defaults bietet mehr Kontrolle als einfaches Strippen

## Risks / Trade-offs

- [Risk] `sanitize-html` könnte legitime Inhalte verstümmeln → Allowlist pro Use-Case erweiterbar
- [Risk] Rekursive Sanitization erhöht CPU-Last bei großen Payloads → nur String-Felder scannen, keine Objekt-Traversierung
- [Risk] Doppelte Sanitization (Pipe + Client-seitig) ist kein Problem – Defense in Depth
