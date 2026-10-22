// Loads the built package the way consumers do: by its name, resolved through
// the "exports" map, once with import (ESM) and once with require (CJS).
// The probes live inside the package directory, so Node resolves the package
// name to this package (self-reference) and axios from client/node_modules.
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const probeDir = mkdtempSync(join(pkgDir, '.pkg-check-'));

const check = `
  const client = new NocodbMiddlewareClient({ baseUrl: 'http://localhost' });
  if (!client.records || !client.admin || !client.auth) throw new Error('services missing');
  if (typeof MiddlewareError !== 'function') throw new Error('MiddlewareError missing');
`;
writeFileSync(
  join(probeDir, 'esm.mjs'),
  `import { NocodbMiddlewareClient, MiddlewareError } from 'nocodb-middleware-client';${check}console.log('ESM ok');`,
);
writeFileSync(
  join(probeDir, 'cjs.cjs'),
  `const { NocodbMiddlewareClient, MiddlewareError } = require('nocodb-middleware-client');${check}console.log('CJS ok');`,
);

let failed = false;
try {
  for (const file of ['esm.mjs', 'cjs.cjs']) {
    try {
      process.stdout.write(
        execFileSync(process.execPath, [file], {
          cwd: probeDir,
          encoding: 'utf8',
          stdio: 'pipe',
        }),
      );
    } catch (error) {
      failed = true;
      console.error(`${file} failed:\n${error.stderr || error.message}`);
    }
  }
} finally {
  rmSync(probeDir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
