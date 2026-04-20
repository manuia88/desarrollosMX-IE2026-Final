#!/usr/bin/env node
// scripts/scores-lineage-export.mjs
// D10 FASE 09 — auto-gen docs/03_CATALOGOS/03.15_SCORE_LINEAGE.md desde SCORE_REGISTRY.
// Ejecutar: npm run scores:lineage-export.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mod = await import(
  resolve(process.cwd(), 'shared/lib/intelligence-engine/cascades/score-lineage.ts')
);
const registryMod = await import(
  resolve(process.cwd(), 'shared/lib/intelligence-engine/registry.ts')
);

const mermaidAll = mod.exportScoreLineageMermaid();
const summary = mod.summarizeLineage();

const byLevel = new Map();
for (const e of registryMod.SCORE_REGISTRY) {
  const arr = byLevel.get(e.level) ?? [];
  arr.push(e);
  byLevel.set(e.level, arr);
}

const levelSections = [];
for (const level of [0, 1, 2, 3, 4, 5]) {
  const entries = byLevel.get(level) ?? [];
  if (entries.length === 0) continue;
  const rows = entries
    .map(
      (e) =>
        `| ${e.score_id} | ${e.name} | ${e.tier} | ${e.category} | ${e.dependencies.join(', ') || '—'} |`,
    )
    .join('\n');
  levelSections.push(`### Nivel ${level} (${entries.length} scores)

| ID | Nombre | Tier | Category | Dependencies |
|---|---|---|---|---|
${rows}`);
}

const content = `# Catálogo 03.15 — Score Lineage Graph

> **AUTO-GENERADO** desde \`shared/lib/intelligence-engine/registry.ts\`.
> No editar a mano. Regenerar con \`npm run scores:lineage-export\`.
>
> Última actualización: ${new Date().toISOString().slice(0, 10)}

## Resumen

- Total scores: **${summary.total_scores}**
- Scores con dependencies: **${summary.scores_with_deps}**
- Max upstream depth: **${summary.max_upstream_depth}**
- Scores hoja (sin downstream): **${summary.scores_without_downstream}**

## Grafo completo (mermaid)

\`\`\`mermaid
${mermaidAll}
\`\`\`

## Dependencies por nivel

${levelSections.join('\n\n')}

## Referencias

- D10 FASE 09 — score relationships graph
- shared/lib/intelligence-engine/cascades/score-lineage.ts
- app/api/admin/scores/dependencies/:scoreId (superadmin endpoint runtime)
`;

const outPath = resolve(process.cwd(), 'docs/03_CATALOGOS/03.15_SCORE_LINEAGE.md');
writeFileSync(outPath, content, 'utf8');
console.log(`✓ ${outPath}`);
