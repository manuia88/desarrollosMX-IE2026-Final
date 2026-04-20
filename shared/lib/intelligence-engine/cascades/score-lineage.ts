// D10 FASE 09 — score lineage helpers.
// Exporta dependency tree desde SCORE_REGISTRY + mermaid graph auto-gen.
// Consumidor: /api/admin/scores/dependencies/:scoreId + scripts/scores-lineage-export.mjs.

import { SCORE_REGISTRY, type ScoreRegistryEntry } from '../registry';

export interface LineageNode {
  readonly score_id: string;
  readonly name: string;
  readonly level: number;
  readonly tier: number;
  readonly category: string;
  readonly dependencies: readonly string[];
  readonly dependents: readonly string[];
}

export interface LineageTree {
  readonly root: LineageNode;
  readonly upstream: readonly LineageNode[];
  readonly downstream: readonly LineageNode[];
  readonly depth_upstream: number;
  readonly depth_downstream: number;
}

function byId(id: string): ScoreRegistryEntry | undefined {
  return SCORE_REGISTRY.find((e) => e.score_id === id);
}

function toNode(entry: ScoreRegistryEntry): LineageNode {
  const dependents = SCORE_REGISTRY.filter((e) => e.dependencies.includes(entry.score_id)).map(
    (e) => e.score_id,
  );
  return {
    score_id: entry.score_id,
    name: entry.name,
    level: entry.level,
    tier: entry.tier,
    category: entry.category,
    dependencies: entry.dependencies,
    dependents,
  };
}

function collectUpstream(scoreId: string, acc: Set<string>, depth: { max: number }, d = 0): void {
  const e = byId(scoreId);
  if (!e) return;
  if (d > depth.max) depth.max = d;
  for (const dep of e.dependencies) {
    if (acc.has(dep)) continue;
    acc.add(dep);
    collectUpstream(dep, acc, depth, d + 1);
  }
}

function collectDownstream(scoreId: string, acc: Set<string>, depth: { max: number }, d = 0): void {
  if (d > depth.max) depth.max = d;
  const direct = SCORE_REGISTRY.filter((e) => e.dependencies.includes(scoreId));
  for (const e of direct) {
    if (acc.has(e.score_id)) continue;
    acc.add(e.score_id);
    collectDownstream(e.score_id, acc, depth, d + 1);
  }
}

export function getScoreLineage(scoreId: string): LineageTree | null {
  const rootEntry = byId(scoreId);
  if (!rootEntry) return null;
  const root = toNode(rootEntry);

  const upstreamIds = new Set<string>();
  const upstreamDepth = { max: 0 };
  collectUpstream(scoreId, upstreamIds, upstreamDepth);

  const downstreamIds = new Set<string>();
  const downstreamDepth = { max: 0 };
  collectDownstream(scoreId, downstreamIds, downstreamDepth);

  const upstream: LineageNode[] = [];
  for (const id of upstreamIds) {
    const e = byId(id);
    if (e) upstream.push(toNode(e));
  }
  const downstream: LineageNode[] = [];
  for (const id of downstreamIds) {
    const e = byId(id);
    if (e) downstream.push(toNode(e));
  }

  return {
    root,
    upstream,
    downstream,
    depth_upstream: upstreamDepth.max,
    depth_downstream: downstreamDepth.max,
  };
}

export function exportScoreLineageMermaid(scoreId?: string): string {
  const lines: string[] = ['flowchart TB'];
  const seen = new Set<string>();

  const add = (from: string, to: string) => {
    const key = `${from}->${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(`  ${from}[${from}] --> ${to}[${to}]`);
  };

  if (scoreId) {
    const tree = getScoreLineage(scoreId);
    if (!tree) return 'flowchart TB\n  error[score_id not found]';
    for (const node of [tree.root, ...tree.upstream, ...tree.downstream]) {
      for (const dep of node.dependencies) {
        add(dep, node.score_id);
      }
    }
  } else {
    for (const e of SCORE_REGISTRY) {
      for (const dep of e.dependencies) {
        add(dep, e.score_id);
      }
    }
  }
  return lines.join('\n');
}

export function summarizeLineage(): {
  total_scores: number;
  scores_with_deps: number;
  max_upstream_depth: number;
  scores_without_downstream: number;
} {
  let scores_with_deps = 0;
  let max_depth = 0;
  let leaves = 0;
  for (const e of SCORE_REGISTRY) {
    if (e.dependencies.length > 0) scores_with_deps++;
    const tree = getScoreLineage(e.score_id);
    if (tree) {
      if (tree.depth_upstream > max_depth) max_depth = tree.depth_upstream;
      if (tree.downstream.length === 0) leaves++;
    }
  }
  return {
    total_scores: SCORE_REGISTRY.length,
    scores_with_deps,
    max_upstream_depth: max_depth,
    scores_without_downstream: leaves,
  };
}
