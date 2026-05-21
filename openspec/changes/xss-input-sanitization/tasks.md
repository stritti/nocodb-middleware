## 1. XSS Sanitization Implementation

- [ ] 1.1 `sanitize-html` als Dependency installieren
- [ ] 1.2 `XssSanitizationPipe` implementieren (global Pipe, rekursiv über String-Felder)
- [ ] 1.3 Allowlist-Konfiguration via `XSS_ALLOWED_TAGS` ENV-Variable
- [ ] 1.4 Pipe in `main.ts` global registrieren (vor dem bestehenden ValidationPipe)

## 2. Tests

- [ ] 2.1 Unit-Tests für die Pipe mit bekannten XSS-Vektoren
- [ ] 2.2 Test: Sanitization entfernt Script-Tags
- [ ] 2.3 Test: Sanitization entfernt Event-Handler (onerror, onclick)
- [ ] 2.4 Test: Erlaubte Tags bleiben erhalten (wenn konfiguriert)
- [ ] 2.5 Test: Nicht-String-Felder bleiben unberührt
