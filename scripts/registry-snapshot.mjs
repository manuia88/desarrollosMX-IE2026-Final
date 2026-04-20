#!/usr/bin/env node
// Snapshot del registry IE → JSON para CI diff + consumo externo.
// Uso: npm run registry:snapshot
// Output: docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.json

import { writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Importar el TS del registry vía tsx (si está) o vía built-in type-stripping Node 24+.
// Fallback: ejecutar con `node --experimental-strip-types scripts/registry-snapshot.mjs`.

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const registryPath = resolve(repoRoot, 'shared/lib/intelligence-engine/registry.ts');
const outPath = resolve(repoRoot, 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.json');

try {
  register('ts-node/esm', pathToFileURL('./'));
} catch {
  // ts-node no disponible — confiamos en Node 24 type-stripping.
}

const mod = await import(pathToFileURL(registryPath).href);
const registry = mod.SCORE_REGISTRY;

const payload = {
  generated_at: new Date().toISOString(),
  version: 1,
  count: registry.length,
  by_level: {
    0: registry.filter((e) => e.level === 0).length,
    1: registry.filter((e) => e.level === 1).length,
    2: registry.filter((e) => e.level === 2).length,
    3: registry.filter((e) => e.level === 3).length,
    4: registry.filter((e) => e.level === 4).length,
    5: registry.filter((e) => e.level === 5).length,
  },
  entries: registry,
};

await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
process.stdout.write(`Snapshot escrito: ${outPath} (${registry.length} entries)\n`);
