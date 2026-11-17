# Scripts

This directory contains automation scripts for repository maintenance and quality assurance.

---

## 📋 Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| [`verify-pr.sh`](./verify-pr.sh) | Verify all quality gates for a PR | `./verify-pr.sh <pr-number>` |
| [`osv-scan.sh`](./osv-scan.sh) | Scan both lockfiles with [OSV-Scanner](https://github.com/google/osv-scanner) (pinned, SHA-256-verified download) and evaluate the findings | `npm run security:osv` |

---

## 🚀 verify-pr.sh

### Description
Verifies that a Pull Request meets all **Quality Gates** before it can be marked as "Ready for Review".

### Quality Gates Checked
1. ✅ **CI Checks** (GitHub Actions)
2. ✅ **Lint** (`npm run lint`)
3. ✅ **Format** (`npm run format:check`)
4. ✅ **Build** (`npm run build`)
5. ✅ **Tests** (`npm run test`)
6. ✅ **Coverage** (`npm run test:cov`)
7. ✅ **OpenAPI Spec** (`npm run generate:openapi`)
8. ✅ **npm Audit** (`npm audit --production`)
9. ✅ **OSV-Scanner** (`npm run security:osv`, see below)

### Usage

#### 1. Make the script executable (one-time setup):
```bash
chmod +x scripts/verify-pr.sh
```

#### 2. Verify a PR:
```bash
./scripts/verify-pr.sh 189
```

#### 3. Example Output:
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

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | ✅ All quality gates passed |
| 1 | ❌ Some quality gates failed |

### Requirements
- [GitHub CLI (`gh`)](https://cli.github.com/) must be installed and authenticated
- Node.js and npm must be installed
- All project dependencies must be installed (`npm install`)

---

## 🛡️ osv-scan.sh

### Description
Runs [OSV-Scanner](https://github.com/google/osv-scanner) (Google) against both
lockfiles of this repository (`package-lock.json` and `client/package-lock.json`)
and evaluates the findings with [`osv-report.mjs`](./osv-report.mjs).

The scanner binary is downloaded once from the pinned GitHub release
(`v2.7.1`) into `node_modules/.cache/osv-scanner/` (gitignored) and verified
against the release `SHA256SUMS`. Requires an authenticated GitHub CLI (`gh`).

### Usage
```bash
npm run security:osv
```

### Policy
- The check **fails on HIGH/CRITICAL findings in production dependencies**
  (the production image is built with `npm ci --only=production`).
- Dev-only findings are reported but do not fail the check; Dependabot and
  Dependency Review handle their updates.
- Configurable via environment variables: `OSV_FAIL_ON=CRITICAL,HIGH` (default)
  and `OSV_FAIL_ON_DEV=true` to also fail on dev-only findings.

### CI
The same scan runs in
[`.github/workflows/security-audit.yml`](../.github/workflows/security-audit.yml)
(job **OSV-Scanner (OSV.dev)**) on every PR, push, weekly schedule and manual
run; SARIF results are uploaded to the Security tab (category `osv-scanner`).

---

## 🤖 GitHub Actions Integration

The quality gate checks are **automatically enforced** via GitHub Actions:
- Workflow: [`.github/workflows/pr-quality-gate.yml`](../.github/workflows/pr-quality-gate.yml)
- Triggers: PR `opened`, `reopened`, `synchronize`, `ready_for_review`
- Posts a **comment** with the results
- **Fails the workflow** if any gate is not met

---

## 📚 Documentation
- Full quality gate documentation: [ `/docs/pr-quality-gates.md`](../docs/pr-quality-gates.md)
