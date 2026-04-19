#!/usr/bin/env node
// audit:habi — bloquea cualquier mención (case-insensitive) de 'habi' en
// código fuente fuera de los archivos donde se permite explícitamente
// (allowlist hardcoded, security tests, comentarios prohibitivos).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.I.1.2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D10
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md §161-167

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import fastGlob from 'fast-glob';

const ROOT = resolve(import.meta.dirname, '..');
const SCAN_GLOBS = [
  'shared/**/*.{ts,tsx}',
  'features/**/*.{ts,tsx}',
  'app/**/*.{ts,tsx}',
  'server/**/*.{ts,tsx}',
  'packages/**/*.{ts,tsx}',
  'supabase/migrations/*.sql',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/.next/**',
];

// Archivos donde Habi se menciona LEGÍTIMAMENTE (allowlist, error msgs,
// tests que validan rechazo, migrations con comentario de prohibición).
const ALLOWED_FILES = new Set([
  'shared/lib/ingest/allowlist.ts',
  'shared/lib/ingest/orchestrator.ts',
  'shared/lib/ingest/types.ts',
  'shared/lib/ingest/__tests__/orchestrator.test.ts',
  'features/market/__tests__/capture.test.ts',
  'tests/security/forbidden-sources.test.ts',
  'shared/lib/ingest/auto-fetch/__tests__/auto-fetcher.test.ts',
  'supabase/migrations/20260418080400_ingest_meta_schema.sql',
]);

const HABI_RE = /\bhabi\b/i;

async function main() {
  const files = await fastGlob(SCAN_GLOBS, { cwd: ROOT, absolute: false });
  const violations = [];
  for (const rel of files) {
    if (ALLOWED_FILES.has(rel)) continue;
    const text = await readFile(resolve(ROOT, rel), 'utf8');
    if (!HABI_RE.test(text)) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (HABI_RE.test(line)) {
        violations.push({ file: rel, lineNumber: i + 1, content: line.trim() });
      }
    }
  }
  if (violations.length === 0) {
    console.log('✓ audit-habi: 0 violations (Habi prohibido — ADR-010 / ADR-012)');
    return;
  }
  console.error('✕ audit-habi: violations encontradas (Habi mention prohibido):');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.lineNumber} → ${v.content}`);
  }
  console.error('');
  console.error('Si necesitas mencionar habi en docs/comentarios:');
  console.error('  - docs/ está fuera del scan');
  console.error('  - allowlist/security tests están exentos');
  console.error('  - cualquier nuevo archivo legítimo: agrégalo a ALLOWED_FILES en este script');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
