## 1. Lint and typing fixes

- [ ] 1.1 Fix remaining ESLint warnings in specs/guards/tests (typed mocks, unbound-method, safe access) _(offen: `no-unsafe-*` und `unbound-method` sind in `eslint.config.js` deaktiviert, viele `as any`)_
- [x] 1.2 Apply formatter on touched files and verify clean run

## 2. Validation and coverage

- [x] 2.1 Run lint with --max-warnings=0 and confirm zero warnings _(ESLint läuft ohne Warnungen)_
- [x] 2.2 Run Jest with coverage and ensure ≥80% global coverage; adjust tests if needed _(Coverage-Gate (≥80 %) im CI-Job `Test & Coverage`)_
