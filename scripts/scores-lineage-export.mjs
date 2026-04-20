#!/usr/bin/env node
// scripts/scores-lineage-export.mjs
// D10 FASE 09 — auto-gen docs/03_CATALOGOS/03.15_SCORE_LINEAGE.md desde SCORE_REGISTRY.
// Ejecutar: npm run scores:lineage-export.
// Replica logic de shared/lib/intelligence-engine/cascades/score-lineage.ts sin
// depender de imports TS relativos (Node 25 type-stripping no resuelve extensionless).

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const registryMod = await import(
  pathToFileURL(resolve(process.cwd(), 'shared/lib/intelligence-engine/registry.ts')).href
);
const SCORE_REGISTRY = registryMod.SCORE_REGISTRY;

function byId(id) {
  return SCORE_REGISTRY.find((e) => e.score_id === id);
}

function collectUpstream(scoreId, acc, depth, d = 0) {
  const e = byId(scoreId);
  if (!e) return;
  if (d > depth.max) depth.max = d;
  for (const dep of e.dependencies) {
    if (acc.has(dep)) continue;
    acc.add(dep);
    collectUpstream(dep, acc, depth, d + 1);
  }
}

function collectDownstream(scoreId, acc, depth, d = 0) {
  if (d > depth.max) depth.max = d;
  const direct = SCORE_REGISTRY.filter((e) => e.dependencies.includes(scoreId));
  for (const e of direct) {
    if (acc.has(e.score_id)) continue;
    acc.add(e.score_id);
    collectDownstream(e.score_id, acc, depth, d + 1);
  }
}

function summarizeLineage() {
  let scores_with_deps = 0;
  let max_depth = 0;
  let leaves = 0;
  for (const e of SCORE_REGISTRY) {
    if (e.dependencies.length > 0) scores_with_deps++;
    const upstreamIds = new Set();
    const upDepth = { max: 0 };
    collectUpstream(e.score_id, upstreamIds, upDepth);
    const downstreamIds = new Set();
    const downDepth = { max: 0 };
    collectDownstream(e.score_id, downstreamIds, downDepth);
    if (upDepth.max > max_depth) max_depth = upDepth.max;
    if (downstreamIds.size === 0) leaves++;
  }
  return {
    total_scores: SCORE_REGISTRY.length,
    scores_with_deps,
    max_upstream_depth: max_depth,
    scores_without_downstream: leaves,
  };
}

function exportMermaid() {
  const lines = ['flowchart TB'];
  const seen = new Set();
  for (const e of SCORE_REGISTRY) {
    for (const dep of e.dependencies) {
      const key = `${dep}->${e.score_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`  ${dep}[${dep}] --> ${e.score_id}[${e.score_id}]`);
    }
  }
  return lines.join('\n');
}

const summary = summarizeLineage();
const mermaidAll = exportMermaid();

const byLevel = new Map();
for (const e of SCORE_REGISTRY) {
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
process.stdout.write(`✓ ${outPath}\n`);
