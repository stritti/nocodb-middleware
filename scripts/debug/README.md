# Debug scripts

Ad-hoc scripts for inspecting and manipulating NocoDB tables during development.

**Warning:** These scripts connect to the configured NocoDB instance and can
modify or delete data (`delete-tables.ts` is destructive). Never run them
against a production instance. They are excluded from the production build and
test coverage.
