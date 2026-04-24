#!/usr/bin/env node
// audit:cross-feature — enforcement Regla #5 CLAUDE.md: "Zero imports
// cross-feature — todo lo compartido va en /shared/".
//
// Uso:
//   node scripts/audit-cross-feature-imports.mjs
//   → exit 0 si todo está limpio (o todas las violaciones están whitelisted),
//     exit 1 si se detecta una violación nueva.
//
// Refs: docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md §3 CRITICAL-001
//       / §5 REFACTOR-001 (romper ciclo causal-engine ⟷ indices-publicos).
//
// Excepciones TEMPORALES documentadas abajo corresponden a los 12 imports
// cross-feature pre-existentes que se resuelven en REFACTOR-002 (FASE 12
// pre-kickoff). No agregar nuevos elementos a EXCEPTIONS sin ADR que justifique.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import fastGlob from 'fast-glob';

const ROOT = resolve(import.meta.dirname, '..');
const SCAN_GLOB = 'features/**/*.{ts,tsx}';
const IGNORE_GLOBS = ['**/node_modules/**', '**/dist/**', '**/.next/**'];

// TEMPORAL — a resolver en REFACTOR-002 (FASE 12 pre-kickoff).
// Cada entrada: '<file-relative-to-root>:<line> → @/features/<target>'.
const EXCEPTIONS = new Set([
  'features/indices-publicos/components/IndexDetailClient.tsx:6 → @/features/pulse-score', // TEMPORAL REFACTOR-002
  'features/newsletter/lib/scorecard-digest-builder.ts:19 → @/features/scorecard-nacional', // TEMPORAL REFACTOR-002
  'features/preview-ux/components/asesor/PitchBuilder.tsx:4 → @/features/indices-publicos', // TEMPORAL REFACTOR-002
  'features/preview-ux/components/comprador/ScoresGrid.tsx:2 → @/features/indices-publicos', // TEMPORAL REFACTOR-002
  'features/preview-ux/mock/narvarte-mock.ts:1 → @/features/trend-genome', // TEMPORAL REFACTOR-002
  'features/preview-ux/types/index.ts:1 → @/features/indices-publicos', // TEMPORAL REFACTOR-002
  'features/preview-ux/types/index.ts:2 → @/features/trend-genome', // TEMPORAL REFACTOR-002
  'features/widget-embed/components/WidgetPulseCard.tsx:5 → @/features/pulse-score', // TEMPORAL REFACTOR-002
  'features/widget-embed/components/WidgetPulseCompare.tsx:5 → @/features/pulse-score', // TEMPORAL REFACTOR-002
  'features/widget-embed/components/WidgetScoreCard.tsx:5 → @/features/indices-publicos', // TEMPORAL REFACTOR-002
  'features/widget-embed/components/WidgetScoreCard.tsx:6 → @/features/indices-publicos', // TEMPORAL REFACTOR-002
  'features/widget-embed/components/WidgetScoreCard.tsx:7 → @/features/indices-publicos', // TEMPORAL REFACTOR-002
]);

const IMPORT_RE = /from\s+['"]@\/features\/([a-z0-9-]+)/g;

function featureOf(relPath) {
  return relPath.split('/')[1];
}

async function main() {
  const files = await fastGlob(SCAN_GLOB, { cwd: ROOT, ignore: IGNORE_GLOBS });

  const violations = [];
  const unused = new Set(EXCEPTIONS);

  for (const rel of files) {
    const abs = resolve(ROOT, rel);
    const content = await readFile(abs, 'utf8');
    const current = featureOf(rel);

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      IMPORT_RE.lastIndex = 0;
      let match;
      // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
      while ((match = IMPORT_RE.exec(line)) !== null) {
        const imported = match[1];
        if (imported !== current) {
          const key = `${rel}:${i + 1} → @/features/${imported}`;
          if (EXCEPTIONS.has(key)) {
            unused.delete(key);
          } else {
            violations.push(key);
          }
        }
      }
    }
  }

  if (unused.size > 0) {
    console.error(`⚠️  ${unused.size} excepciones obsoletas (ya no aplican — retirar):\n`);
    for (const u of unused) console.error(`  - ${u}`);
    console.error('');
  }

  if (violations.length === 0) {
    console.log(
      `✅ Zero cross-feature violations (${EXCEPTIONS.size} excepciones TEMPORAL documentadas pendientes de REFACTOR-002).`,
    );
    process.exit(unused.size > 0 ? 1 : 0);
  }

  console.error(`❌ ${violations.length} nuevos cross-feature imports detectados:\n`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\nRegla #5 CLAUDE.md: Zero imports cross-feature — move shared code to /shared/.`);
  console.error(
    'Refs: docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md §3 CRITICAL-001 / §5 REFACTOR-001.',
  );
  process.exit(1);
}

void main();
