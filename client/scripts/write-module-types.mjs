// dist/esm holds ES modules and dist/cjs CommonJS, both with a .js extension.
// A package.json per folder tells Node (and TypeScript) which format applies,
// independent of the package root (which has no "type").
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
writeFileSync(join(dist, 'esm', 'package.json'), '{ "type": "module" }\n');
writeFileSync(join(dist, 'cjs', 'package.json'), '{ "type": "commonjs" }\n');
