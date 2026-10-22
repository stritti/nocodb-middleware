## 1. XSS Sanitization Implementation

- [x] 1.1 `sanitize-html` als Dependency installieren
- [ ] 1.2 `XssSanitizationPipe` implementieren (global Pipe, rekursiv über String-Felder) _(Middleware wirft unter Express 5 (`req.query` read-only); behoben in #287)_
- [ ] 1.3 Allowlist-Konfiguration via `XSS_ALLOWED_TAGS` ENV-Variable
- [x] 1.4 Pipe in `main.ts` global registrieren (vor dem bestehenden ValidationPipe) _(Middleware wird in `main.ts` global registriert)_

## 2. Tests

- [x] 2.1 Unit-Tests für die Pipe mit bekannten XSS-Vektoren
- [x] 2.2 Test: Sanitization entfernt Script-Tags
- [ ] 2.3 Test: Sanitization entfernt Event-Handler (onerror, onclick)
- [x] 2.4 Test: Erlaubte Tags bleiben erhalten (wenn konfiguriert)
- [x] 2.5 Test: Nicht-String-Felder bleiben unberührt
