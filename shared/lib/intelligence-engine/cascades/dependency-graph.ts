// F1 — Cascade dependency graph visualizable.
// Ref: FASE 08 plan §BLOQUE 8.F prompt v8 F1 + ADR-010 §D7 (6 cascadas formales).
//
// Source of truth operacional de las cascadas. Usado por:
//   - geo-data-updated.ts / macro-updated.ts (triggers SQL lookup scores afectados)
//   - /api/admin/cascades/graph (retorna JSON + mermaid)
//   - scripts/cascades-export.mjs (regenera 03.14_CASCADE_GRAPH.md)

export interface CascadeGraphShape {
  readonly unit_sold: readonly string[];
  readonly price_changed: readonly string[];
  readonly macro_updated: readonly string[];
  readonly feedback_registered: readonly string[];
  readonly search_behavior: readonly string[];
  readonly geo_data_updated: Readonly<Record<string, readonly string[]>>;
}

export const CASCADE_GRAPH: CascadeGraphShape = {
  unit_sold: ['B08', 'E01', 'D02', 'B03', 'B09'],
  price_changed: ['A12', 'A01', 'A04', 'A02', 'B02', 'B03', 'E01'],
  macro_updated: ['A01', 'A03', 'A04', 'A05', 'B02', 'B12', 'D01', 'C05'],
  feedback_registered: ['B04', 'B03', 'C04'],
  search_behavior: ['B01', 'B04', 'H14'],
  geo_data_updated: {
    denue: ['F03', 'N01', 'N02', 'N03', 'N08', 'N09', 'N10'],
    fgj: ['F01', 'N04', 'N09'],
    gtfs: ['F02', 'N02', 'N05', 'N08'],
    siged: ['H01', 'N06', 'N10'],
    dgis: ['H02', 'N10'],
    sacmex: ['F05', 'N07', 'H10', 'N05'],
    atlas_riesgos: ['H03', 'N05'],
    rama: ['F04'],
    inah: ['H08'],
  },
} as const;

export type CascadeEventName =
  | 'unit_sold'
  | 'price_changed'
  | 'macro_updated'
  | 'feedback_registered'
  | 'search_behavior';

export function getScoresForCascade(event: CascadeEventName): readonly string[] {
  return CASCADE_GRAPH[event];
}

export function getScoresForGeoSource(source: string): readonly string[] {
  return CASCADE_GRAPH.geo_data_updated[source] ?? [];
}

export interface CascadeGraphSummary {
  readonly total_cascades: number;
  readonly total_edges: number;
  readonly unique_scores_affected: number;
}

export function summarizeGraph(): CascadeGraphSummary {
  const scores = new Set<string>();
  let edges = 0;
  for (const key of [
    'unit_sold',
    'price_changed',
    'macro_updated',
    'feedback_registered',
    'search_behavior',
  ] as const) {
    const arr = CASCADE_GRAPH[key];
    edges += arr.length;
    for (const s of arr) scores.add(s);
  }
  for (const src of Object.keys(CASCADE_GRAPH.geo_data_updated)) {
    const arr = CASCADE_GRAPH.geo_data_updated[src] ?? [];
    edges += arr.length;
    for (const s of arr) scores.add(s);
  }
  return {
    total_cascades: 5 + Object.keys(CASCADE_GRAPH.geo_data_updated).length,
    total_edges: edges,
    unique_scores_affected: scores.size,
  };
}

export function exportSequenceMermaid(): string {
  const lines: string[] = ['flowchart LR'];
  const seen = new Set<string>();

  const addEdge = (from: string, to: string, label?: string) => {
    const fromId = from.replace(/[^a-zA-Z0-9_]/g, '_');
    const toId = to.replace(/[^a-zA-Z0-9_]/g, '_');
    const key = `${fromId}->${toId}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(`  ${fromId}${label ? `[${label}]` : `[${from}]`} --> ${toId}[${to}]`);
  };

  for (const key of [
    'unit_sold',
    'price_changed',
    'macro_updated',
    'feedback_registered',
    'search_behavior',
  ] as const) {
    for (const score of CASCADE_GRAPH[key]) {
      addEdge(key, score);
    }
  }
  for (const src of Object.keys(CASCADE_GRAPH.geo_data_updated)) {
    const geoId = `geo_${src}`;
    for (const score of CASCADE_GRAPH.geo_data_updated[src] ?? []) {
      addEdge(geoId, score, `geo_data_updated:${src}`);
    }
  }
  return lines.join('\n');
}

export function exportGraphJson(): CascadeGraphShape {
  return CASCADE_GRAPH;
}
