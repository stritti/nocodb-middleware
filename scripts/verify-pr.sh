#!/bin/bash

# PR Quality Gate Verification Script
# Usage: ./scripts/verify-pr.sh <pr-number>
# Example: ./scripts/verify-pr.sh 189

set -e

PR_NUMBER="$1"
REPO="stritti/nocodb-middleware"

if [ -z "$PR_NUMBER" ]; then
    echo "❌ Usage: $0 <pr-number>"
    exit 1
fi

echo "🔍 Verifying PR #$PR_NUMBER for $REPO..."
echo ""

# Function to check if all CI checks pass
check_ci_checks() {
    echo "📋 Checking CI checks..."
    local ci_status
    ci_status=$(gh pr view $PR_NUMBER --repo $REPO --json statusCheckRollup --jq '.statusCheckRollup | map(select(.conclusion != "SUCCESS" and .conclusion != "SKIPPED")) | length')
    
    if [ "$ci_status" -eq 0 ]; then
        echo "✅ All CI checks passed"
        return 0
    else
        echo "❌ Some CI checks failed:"
        gh pr view $PR_NUMBER --repo $REPO --json statusCheckRollup --jq '.statusCheckRollup | map(select(.conclusion != "SUCCESS" and .conclusion != "SKIPPED")) | .[] | "  - \(.name): \(.conclusion)"'
        return 1
    fi
}

# Function to check lint
check_lint() {
    echo "🔍 Checking lint..."
    if npm run lint > /dev/null 2>&1; then
        echo "✅ Lint passed"
        return 0
    else
        echo "❌ Lint failed"
        npm run lint 2>&1 | head -20
        return 1
    fi
}

# Function to check format
check_format() {
    echo "🔍 Checking format..."
    if npm run format:check > /dev/null 2>&1; then
        echo "✅ Format check passed"
        return 0
    else
        echo "❌ Format check failed"
        npm run format:check 2>&1 | head -20
        return 1
    fi
}

# Function to check build
check_build() {
    echo "🔍 Checking build..."
    if npm run build > /dev/null 2>&1; then
        echo "✅ Build passed"
        return 0
    else
        echo "❌ Build failed"
        npm run build 2>&1 | tail -20
        return 1
    fi
}

# Function to check tests
check_tests() {
    echo "🔍 Checking tests..."
    if npm run test > /dev/null 2>&1; then
        echo "✅ Tests passed"
        return 0
    else
        echo "❌ Tests failed"
        npm run test 2>&1 | tail -30
        return 1
    fi
}

# Function to check coverage
check_coverage() {
    echo "🔍 Checking coverage..."
    if npm run test:cov > /dev/null 2>&1; then
        echo "✅ Coverage check passed"
        return 0
    else
        echo "❌ Coverage check failed"
        npm run test:cov 2>&1 | tail -30
        return 1
    fi
}

# Function to check OpenAPI spec
check_openapi() {
    echo "🔍 Checking OpenAPI spec..."
    if npm run generate:openapi > /dev/null 2>&1; then
        echo "✅ OpenAPI spec is fresh"
        return 0
    else
        echo "❌ OpenAPI spec generation failed"
        npm run generate:openapi 2>&1 | tail -20
        return 1
    fi
}

# Function to check npm audit
check_audit() {
    echo "🔍 Checking npm audit..."
    if npm audit --production > /dev/null 2>&1; then
        echo "✅ npm audit passed"
        return 0
    else
        echo "⚠️  npm audit has issues (non-blocking)"
        npm audit --production 2>&1 | grep -E "(found|fix)" | head -5
        return 0  # Non-blocking
    fi
}

# Main execution
echo "=========================================="
echo "  PR Quality Gate Verification"
echo "=========================================="
echo ""

FAILED=0

# Check CI checks (remote)
if ! check_ci_checks; then
    FAILED=1
fi
echo ""

# Local checks
echo "🏗️  Running local quality gates..."
echo ""

if ! check_lint; then
    FAILED=1
fi
echo ""

if ! check_format; then
    FAILED=1
fi
echo ""

if ! check_build; then
    FAILED=1
fi
echo ""

if ! check_tests; then
    FAILED=1
fi
echo ""

if ! check_coverage; then
    FAILED=1
fi
echo ""

if ! check_openapi; then
    FAILED=1
fi
echo ""

if ! check_audit; then
    FAILED=1
fi
echo ""

# Final result
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ ALL QUALITY GATES PASSED"
    echo "PR #$PR_NUMBER is ready for review!"
    exit 0
else
    echo "❌ SOME QUALITY GATES FAILED"
    echo "Please fix the issues above before marking as ready for review."
    exit 1
fi
