# PR Quality Gates

## 🎯 Overview

This repository enforces **Quality Gates** for all Pull Requests to ensure:
- ✅ **Code Quality**: Linting and formatting standards
- ✅ **Build Success**: TypeScript compilation without errors
- ✅ **Test Coverage**: All tests pass with minimum coverage thresholds
- ✅ **CI Checks**: All GitHub Actions workflows pass
- ✅ **Security**: No critical vulnerabilities in dependencies

---

## 🚀 Quality Gates Checklist

### 1. **CI Checks** (Automatic)
All GitHub Actions workflows must pass:
- `CI` (Lint + Format + Build)
- `OpenAPI Spec` (OpenAPI specification freshness)
- `Security Audit` (npm audit + dependency review)

**Check:** `gh pr view <number> --json statusCheckRollup`

---

### 2. **Lint**
ESLint must pass without errors.

```bash
npm run lint
```

**Rules:**
- No `any` types (strict TypeScript)
- No unused variables
- Follow project ESLint configuration

---

### 3. **Format**
Code must be formatted according to Prettier rules.

```bash
npm run format:check
```

**Fix:**
```bash
npm run format
```

---

### 4. **Build**
TypeScript compilation must succeed.

```bash
npm run build
```

---

### 5. **Tests**
All unit and integration tests must pass.

```bash
npm run test
```

---

### 6. **Coverage**
Test coverage must meet minimum thresholds:
- **Statements**: ≥ 80%
- **Branches**: ≥ 70%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%

```bash
npm run test:cov
```

---

### 7. **OpenAPI Spec**
OpenAPI specification must be up-to-date.

```bash
npm run generate:openapi
```

---

### 8. **npm Audit**
No critical vulnerabilities in production dependencies.

```bash
npm audit --production
```

---

## 🤖 Automation

### GitHub Actions Workflow
The [`.github/workflows/pr-quality-gate.yml`](/.github/workflows/pr-quality-gate.yml) workflow automatically:
1. Runs on PR events: `opened`, `reopened`, `synchronize`, `ready_for_review`
2. Executes all quality gate checks
3. Posts a **comment** with the results
4. **Fails the workflow** if any gate is not met

### Local Verification Script
Use the [`scripts/verify-pr.sh`](/scripts/verify-pr.sh) script to verify a PR locally:

```bash
# Make executable (once)
chmod +x scripts/verify-pr.sh

# Verify a PR
./scripts/verify-pr.sh 189
```

**Output:**
```
==========================================
  PR Quality Gate Verification
==========================================

📋 Checking CI checks...
✅ All CI checks passed

🏗️  Running local quality gates...

🔍 Checking lint...
✅ Lint passed

🔍 Checking format...
✅ Format check passed

🔍 Checking build...
✅ Build passed

🔍 Checking tests...
✅ Tests passed

🔍 Checking coverage...
✅ Coverage check passed

🔍 Checking OpenAPI spec...
✅ OpenAPI spec is fresh

🔍 Checking npm audit...
✅ npm audit passed

==========================================
✅ ALL QUALITY GATES PASSED
PR #189 is ready for review!
```

---

## 📋 Before Marking a PR as "Ready for Review"

1. **Run all quality gates locally:**
   ```bash
   ./scripts/verify-pr.sh <pr-number>
   ```

2. **Check GitHub Actions:**
   - All workflows must be **green** ✅

3. **Review the PR Quality Gate comment:**
   - The bot will post a **comment** with the results
   - Example:
     ```markdown
     ## 🚀 PR Quality Gate Report
     
     ✅ **ALL QUALITY GATES PASSED**
     
     | Gate | Status |
     |------|--------|
     | CI Checks | ✅ |
     | Lint | ✅ |
     | Format | ✅ |
     | Build | ✅ |
     | Tests | ✅ |
     | Coverage | ✅ |
     | OpenAPI | ✅ |
     | npm Audit | ✅ |
     
     🎉 This PR is ready for review!
     ```

4. **If any gate fails:**
   - Fix the issues
   - Push the changes
   - The workflow will **automatically re-run**

---

## 🛠 Troubleshooting

### Common Issues

#### ❌ Lint Failed
**Cause:** ESLint rule violations
**Fix:**
```bash
npm run lint -- --fix  # Auto-fix some issues
# Then manually fix remaining issues
```

#### ❌ Format Check Failed
**Cause:** Code not formatted with Prettier
**Fix:**
```bash
npm run format
```

#### ❌ Build Failed
**Cause:** TypeScript compilation errors
**Fix:**
- Check for type errors
- Ensure all imports are correct
- Verify `noImplicitAny` compliance

#### ❌ Tests Failed
**Cause:** Failing unit/integration tests
**Fix:**
```bash
npm run test -- --verbose
# Fix failing tests
```

#### ❌ Coverage Failed
**Cause:** Coverage below thresholds
**Fix:**
- Add tests for untested code
- Or exclude files from coverage in `package.json`:
  ```json
  "collectCoverageFrom": ["**/*.ts", "!file-to-exclude.ts"]
  ```

#### ❌ OpenAPI Spec Failed
**Cause:** OpenAPI spec is out of date
**Fix:**
```bash
npm run generate:openapi
# Commit the updated openapi.json
```

---

## 📊 Quality Gate Summary

| Gate | Command | Threshold | Blocking |
|------|---------|-----------|----------|
| CI Checks | GitHub Actions | All pass | ✅ Yes |
| Lint | `npm run lint` | No errors | ✅ Yes |
| Format | `npm run format:check` | No issues | ✅ Yes |
| Build | `npm run build` | Success | ✅ Yes |
| Tests | `npm run test` | All pass | ✅ Yes |
| Coverage | `npm run test:cov` | ≥80% statements, ≥70% branches | ✅ Yes |
| OpenAPI | `npm run generate:openapi` | Success | ✅ Yes |
| npm Audit | `npm audit --production` | No critical issues | ⚠️ No |

---

## 🔗 References
- [GitHub Actions Workflow](/.github/workflows/pr-quality-gate.yml)
- [Verification Script](/scripts/verify-pr.sh)
- [ESLint Config](/eslint.config.js)
- [Prettier Config](/.prettierrc)
