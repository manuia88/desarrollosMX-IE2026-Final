// Node ESM resolver hook — resuelve bare imports relativos a `.ts` / `/index.ts`
// cuando el módulo no trae extensión explícita. Necesario porque
// shared/lib/intelligence-engine/**.ts fue autorizado con bare imports para el
// pipeline Next.js/vitest; los scripts CLI compute bajo --experimental-strip-types
// deben cruzar esa frontera.
//
// Uso: node --experimental-strip-types --import ./scripts/compute/_register-ts-loader.mjs <script>

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HAS_EXT = /\.[a-z0-9]+$/i;
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

function tryResolveTsFile(absNoExt) {
  const tsPath = `${absNoExt}.ts`;
  if (existsSync(tsPath)) return tsPath;
  const idxPath = path.join(absNoExt, 'index.ts');
  if (existsSync(idxPath)) return idxPath;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Path alias `@/…` → PROJECT_ROOT/…
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    const absNoExt = path.resolve(PROJECT_ROOT, rel);
    const hit = HAS_EXT.test(rel)
      ? (existsSync(absNoExt) ? absNoExt : null)
      : tryResolveTsFile(absNoExt);
    if (hit) {
      return nextResolve(pathToFileURL(hit).href, context);
    }
  }
  // Relative bare import sin extension → append .ts / /index.ts
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  if (isRelative && !HAS_EXT.test(specifier)) {
    try {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const absNoExt = path.resolve(parentDir, specifier);
      const hit = tryResolveTsFile(absNoExt);
      if (hit) {
        return nextResolve(pathToFileURL(hit).href, context);
      }
    } catch {
      // fall through to default resolver
    }
  }
  return nextResolve(specifier, context);
}
