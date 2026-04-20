#!/usr/bin/env node
// scripts/cascades-export.mjs
// F1 — Regenera docs/03_CATALOGOS/03.14_CASCADE_GRAPH.md con diagrama mermaid
// auto-generado desde CASCADE_GRAPH. Ejecutar: npm run cascades:export.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mod = await import(
  resolve(process.cwd(), 'shared/lib/intelligence-engine/cascades/dependency-graph.ts')
);

const mermaid = mod.exportSequenceMermaid();
const summary = mod.summarizeGraph();
const json = mod.exportGraphJson();

const content = `# Catálogo 03.14 — Cascade Dependency Graph

> **AUTO-GENERADO** desde \`shared/lib/intelligence-engine/cascades/dependency-graph.ts\`.
> No editar a mano. Regenerar con \`npm run cascades:export\`.
>
> Última actualización: ${new Date().toISOString().slice(0, 10)}

## Resumen

- Cascadas totales: **${summary.total_cascades}**
- Edges totales: **${summary.total_edges}**
- Scores únicos afectados: **${summary.unique_scores_affected}**

## Diagrama (mermaid)

\`\`\`mermaid
${mermaid}
\`\`\`

## JSON completo

\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`

## Referencias

- ADR-010 §D7 — Las 6 cascadas formales
- shared/lib/intelligence-engine/cascades/dependency-graph.ts
- app/api/admin/cascades/graph/route.ts (superadmin endpoint runtime)
`;

const outPath = resolve(process.cwd(), 'docs/03_CATALOGOS/03.14_CASCADE_GRAPH.md');
writeFileSync(outPath, content, 'utf8');
console.log(`✓ ${outPath}`);
