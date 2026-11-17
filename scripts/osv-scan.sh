#!/usr/bin/env bash
# Runs google/osv-scanner (https://github.com/google/osv-scanner) against the
# lockfiles of this repository: package-lock.json (middleware) and
# client/package-lock.json (client library).
#
# The scanner binary is downloaded once from the pinned GitHub release into
# node_modules/.cache/osv-scanner/ (gitignored) and verified against the
# release SHA256SUMS. Requires the GitHub CLI (`gh`) to be authenticated.
#
# Usage:
#   npm run security:osv              # scan + evaluate (default)
#   bash scripts/osv-scan.sh [args]   # extra args are passed to osv-scanner,
#                                     # e.g. --format=vertical or --serve
#
# Exit codes: 0 = no blocking findings, 1 = blocking findings (or the scan
# itself found vulnerabilities without a JSON report), 2 = tool/setup error.

set -euo pipefail

OSV_SCANNER_VERSION="v2.7.1"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="$REPO_ROOT/node_modules/.cache/osv-scanner/$OSV_SCANNER_VERSION"
RESULTS="$CACHE_DIR/osv-results.json"

cd "$REPO_ROOT"
mkdir -p "$CACHE_DIR"

case "$(uname -s)" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *) echo "::error::Unsupported OS: $(uname -s) (use Linux or macOS; CI covers the scan)" >&2; exit 2 ;;
esac
case "$(uname -m)" in
  x86_64) arch="amd64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) echo "::error::Unsupported architecture: $(uname -m)" >&2; exit 2 ;;
esac

ASSET="osv-scanner_${os}_${arch}"
BIN="$CACHE_DIR/$ASSET"

if [ ! -x "$BIN" ]; then
  echo "Downloading osv-scanner $OSV_SCANNER_VERSION ($ASSET)..."
  gh release download "$OSV_SCANNER_VERSION" \
    --repo google/osv-scanner \
    --dir "$CACHE_DIR" \
    --clobber \
    --pattern "$ASSET" \
    --pattern osv-scanner_SHA256SUMS
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$CACHE_DIR" && grep -E "^[0-9a-f]{64}  ${ASSET}$" osv-scanner_SHA256SUMS | sha256sum -c -)
  else
    (cd "$CACHE_DIR" && grep -E "^[0-9a-f]{64}  ${ASSET}$" osv-scanner_SHA256SUMS | shasum -a 256 -c -)
  fi
  chmod +x "$BIN"
fi

rm -f "$RESULTS"

set +e
"$BIN" scan \
  --lockfile=package-lock.json \
  --lockfile=client/package-lock.json \
  --format=json \
  --output-file="$RESULTS" \
  "$@"
rc=$?
set -e

if [ -s "$RESULTS" ]; then
  node scripts/osv-report.mjs "$RESULTS"
  exit $?
fi

exit "$rc"
