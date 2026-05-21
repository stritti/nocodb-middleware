## ADDED Requirements

### Requirement: Lint must pass with zero warnings
The system SHALL enforce ESLint with `--max-warnings=0` across code and tests without disabling rules, ensuring no warnings remain in specs, guards, services, or utilities.

#### Scenario: Lint run succeeds
- **WHEN** lint is executed via npm script with strict settings
- **THEN** it completes with zero warnings or errors

### Requirement: Formatter compliance
The system SHALL ensure formatter (Prettier or project formatter) runs cleanly on all modified files, producing no formatting issues.

#### Scenario: Formatter run
- **WHEN** formatter is executed on the codebase
- **THEN** it completes without reporting differences

### Requirement: Strict typing in tests and mocks
The system SHALL apply explicit typings or guards in tests/mocks to remove unsafe `any` usage and unbound-method issues while preserving behavior.

#### Scenario: Typed mocks
- **WHEN** tests define mocks for services/clients
- **THEN** mocks use explicit types or typed helper wrappers, avoiding unsafe member access

### Requirement: Guard/service safety
The system SHALL ensure guards and related services use typed request/user objects and safe access patterns, eliminating unsafe member operations without changing behavior.

#### Scenario: Guard request typing
- **WHEN** a guard inspects request.user or context data
- **THEN** access is typed or guarded to avoid unsafe operations while maintaining current logic

### Requirement: Test coverage threshold
The system SHALL maintain project unit test coverage at or above 80% after lint/format fixes.

#### Scenario: Coverage check
- **WHEN** Jest coverage is computed post-changes
- **THEN** global coverage metrics remain at or above 80%

### Requirement: Definition of done gates
The system SHALL require lint, formatter, and unit tests to complete successfully for the feature to be considered done.

#### Scenario: Quality gates
- **WHEN** lint, formatter, and unit tests are executed
- **THEN** all complete without errors or warnings and mark the feature as complete
