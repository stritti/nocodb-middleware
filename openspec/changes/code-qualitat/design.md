## Context

Lint warnings (strict ESLint with `--max-warnings=0`) remain across specs, guards, and a few prod services. Formatter compliance is required. Test coverage must stay ≥80%. Recent refactors already cleaned nocodb and permission services; remaining hotspots: permissions.guard.ts, roles.service.ts, nocodb/permissions/user-roles specs, e2e/supertest helpers, and test-phase scripts. No API behavior changes—internal quality hardening.

## Goals / Non-Goals

**Goals:**
- Reduce ESLint warnings to zero without disabling rules.
- Apply typed mocks/guards to eliminate `any`/unbound-method issues in specs/tests.
- Keep formatter clean.
- Maintain ≥80% Jest coverage.

**Non-Goals:**
- No feature or API changes.
- No rule relaxations or eslint config changes.
- No new external dependencies unless already present in project.

## Decisions

- Use precise typings and helper type guards for permissions/roles services to avoid unsafe access.
- Convert spec mocks to typed objects/arrow functions to satisfy `no-unsafe-any` and `unbound-method`.
- Cast supertest chains to the correct type or wrap with typed helpers in phase test scripts/e2e.
- Prefer local helper functions over inline `as any` to keep safety and readability.
- Preserve existing module boundaries; no structural refactors beyond necessary typing/safety fixes.

## Risks / Trade-offs

- [Risk] Typing changes in mocks may diverge from real implementations → Mitigation: mirror actual interfaces/services when available; limit casts.
- [Risk] Coverage dip if tests refactored → Mitigation: run Jest and adjust tests to keep assertions.
- [Risk] Potential runtime change if guard/service logic adjusted for typing → Mitigation: keep behavior identical; add unit coverage for edge cases if touched.
