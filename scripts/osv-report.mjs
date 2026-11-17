#!/usr/bin/env node
// Evaluates the JSON output of `osv-scanner scan` (google/osv-scanner).
//
// - prints a table of all findings to stdout
// - appends a Markdown summary to $GITHUB_STEP_SUMMARY when set (CI)
// - emits ::error annotations for blocking findings (max 10, GitHub limit)
// - exits 1 when blocking findings exist, 0 when clean, 2 on usage errors
//
// Policy (configurable via env):
//   OSV_FAIL_ON      comma-separated severities; the check fails on any
//                    finding at or above the lowest listed severity
//                    (default: CRITICAL,HIGH, i.e. HIGH and CRITICAL)
//   OSV_FAIL_ON_DEV  "true" to also fail on dev-only findings
//                    (default: false; the production image is built with
//                    `npm ci --only=production`, so dev-only findings do not
//                    ship)
//
// Usage: node scripts/osv-report.mjs [path/to/osv-results.json]

import { appendFileSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

const SEVERITY_RANK = { UNKNOWN: 0, LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };

function severityRank(label) {
  return SEVERITY_RANK[String(label).toUpperCase()] ?? 0;
}

function severityFromScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'UNKNOWN';
  if (n >= 9.0) return 'CRITICAL';
  if (n >= 7.0) return 'HIGH';
  if (n >= 4.0) return 'MODERATE';
  return 'LOW';
}

function collectFindings(report) {
  const rows = [];
  for (const result of report.results ?? []) {
    const file = result.source?.path ?? '(unknown)';
    for (const pkg of result.packages ?? []) {
      const groups = pkg.dependency_groups ?? [];
      for (const vuln of pkg.vulnerabilities ?? []) {
        const group = (pkg.groups ?? []).find((g) => (g.ids ?? []).includes(vuln.id));
        const severity =
          vuln.database_specific?.severity ?? severityFromScore(group?.max_severity);
        rows.push({
          file,
          package: `${pkg.package?.name ?? '?'}@${pkg.package?.version ?? '?'}`,
          id: vuln.id ?? '(unknown)',
          aliases: (vuln.aliases ?? []).join(', '),
          severity: String(severity).toUpperCase(),
          // `npm ci --only=production` omits only dev dependencies; optional
          // dependencies are still installed in production and stay in scope.
          devOnly: groups.includes('dev'),
        });
      }
    }
  }
  return rows;
}

function main() {
  const file = process.argv[2] ?? 'node_modules/.cache/osv-scanner/osv-results.json';
  let report;
  try {
    report = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`::error::Cannot read OSV-Scanner results from ${file}: ${err.message}`);
    process.exit(2);
  }

  const failOn = (process.env.OSV_FAIL_ON ?? 'CRITICAL,HIGH')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const failOnDev = process.env.OSV_FAIL_ON_DEV === 'true';
  const minRank = failOn.length > 0 ? Math.min(...failOn.map(severityRank)) : 0;

  const rows = collectFindings(report);
  const blocking = rows.filter(
    (r) => severityRank(r.severity) >= minRank && (failOnDev || !r.devOnly),
  );

  rows.sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      a.package.localeCompare(b.package) ||
      a.id.localeCompare(b.id),
  );

  console.log(`OSV-Scanner: ${rows.length} finding(s), ${blocking.length} blocking`);
  if (rows.length > 0) {
    const header = ['SEVERITY', 'ID', 'PACKAGE', 'GROUPS', 'LOCKFILE'];
    const lines = rows.map((r) => [
      r.severity,
      r.id,
      r.package,
      r.devOnly ? 'dev' : 'prod',
      relative(process.cwd(), r.file) || r.file,
    ]);
    const widths = header.map((h, i) =>
      Math.max(h.length, ...lines.map((l) => l[i].length)),
    );
    const fmt = (cols) => cols.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
    console.log(fmt(header));
    console.log(widths.map((w) => '-'.repeat(w)).join('  '));
    for (const line of lines) console.log(fmt(line));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `### OSV-Scanner: ${rows.length} finding(s), ${blocking.length} blocking (fail on ${failOn.join('/')}${failOnDev ? ', incl. dev-only' : ', prod only'})`,
      '',
    ];
    if (rows.length > 0) {
      summary.push('| Severity | ID | Package | Groups | Lockfile |', '|---|---|---|---|---|');
      for (const r of rows) {
        const file = relative(process.cwd(), r.file) || r.file;
        summary.push(
          `| ${r.severity} | ${r.id} | ${r.package} | ${r.devOnly ? 'dev' : 'prod'} | ${file} |`,
        );
      }
    }
    summary.push('');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n'));
  }

  for (const r of blocking.slice(0, 10)) {
    const file = relative(process.cwd(), r.file) || r.file;
    console.log(
      `::error file=${file}::OSV-Scanner: ${r.severity} ${r.id} in ${r.package} (${r.aliases || 'no aliases'})`,
    );
  }

  if (blocking.length > 0) {
    console.error(
      `OSV-Scanner: ${blocking.length} blocking finding(s) (severity >= ${failOn.join('/')}${failOnDev ? '' : ', production dependencies only'})`,
    );
    process.exit(1);
  }
}

main();
