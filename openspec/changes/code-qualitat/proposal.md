## Why

ESLint warnings block CI because `--max-warnings=0` is enforced; residual warnings (esp. specs/guards/tests) prevent merges. Ensuring lint and formatter pass cleanly while maintaining ≥80% coverage keeps code quality consistent and unblocks delivery.

## What Changes

- Clean remaining ESLint warnings across specs, guards, and tests without disabling rules.
- Tighten typings and safe access patterns in tests/mocks to satisfy strict lint rules.
- Ensure formatter compliance alongside lint fixes.
- Confirm unit test coverage remains ≥80% after changes.

## Capabilities

### New Capabilities
- `code-quality-hardening`: Enforces lint/format cleanliness and structured typing fixes so tests/mocks align with strict ESLint rules while preserving coverage standards.

### Modified Capabilities
- None.

## Impact

- Affects NestJS test suites (specs), guards (permissions), and selected services (roles/permissions/nocodb).
- Impacts lint/test CI gates (eslint, formatter, jest coverage ≥80%).
- No API surface changes expected; internal quality improvements only.
