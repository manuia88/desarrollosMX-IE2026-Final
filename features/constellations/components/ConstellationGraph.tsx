'use client';

// BLOQUE 11.R.3.3 — Graph viewer SVG force-directed simple (sin D3 dep).
// Por constraint "no instalar libs nuevas" (package.json no incluye d3),
// implementamos simulación Verlet mínima que converge en ~50 iters sobre
// 50 nodes — suficiente para visualización nacional H1.
//
// Nodes coloreados por cluster_id (Louvain 11.R.1.2). Edge thickness por
// edge_weight. Hover → tooltip con edge_types breakdown. Click → focus.

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type {
  ConstellationCluster,
  ConstellationEdge,
  EdgeType,
  EdgeTypeBreakdown,
} from '@/features/constellations/types';
import { EDGE_TYPES } from '@/features/constellations/types';

interface ConstellationGraphProps {
  readonly sourceColoniaId: string;
  readonly sourceLabel: string | null;
  readonly edges: readonly ConstellationEdge[];
  readonly clusters: readonly ConstellationCluster[];
  readonly customWeights?: Partial<Record<EdgeType, number>>;
  readonly width?: number;
  readonly height?: number;
}

interface Node {
  id: string;
  label: string | null;
  cluster: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isSource: boolean;
  degree: number;
}

const CLUSTER_COLORS = [
  'oklch(0.72 0.15 30)', // warm orange
  'oklch(0.68 0.18 240)', // blue
  'oklch(0.70 0.18 140)', // green
  'oklch(0.70 0.20 320)', // magenta
  'oklch(0.75 0.15 85)', // yellow
  'oklch(0.65 0.15 280)', // purple
  'oklch(0.68 0.15 200)', // teal
  'oklch(0.70 0.16 60)', // amber
];

function clusterColor(clusterId: number): string {
  const idx = clusterId % CLUSTER_COLORS.length;
  return CLUSTER_COLORS[idx] ?? CLUSTER_COLORS[0] ?? 'oklch(0.7 0.15 240)';
}

function applyCustomEdgeWeight(
  types: EdgeTypeBreakdown,
  custom: Partial<Record<EdgeType, number>> | undefined,
): number {
  if (!custom) {
    // Default weights 0.3 + 0.15 + 0.3 + 0.25.
    return (
      types.migration * 0.3 +
      types.climate_twin * 0.15 +
      types.genoma_similarity * 0.3 +
      types.pulse_correlation * 0.25
    );
  }
  let weightSum = 0;
  let total = 0;
  for (const t of EDGE_TYPES) {
    const w = custom[t] ?? 0;
    if (w > 0) {
      weightSum += types[t] * w;
      total += w;
    }
  }
  return total > 0 ? weightSum / total : 0;
}

function simulate(
  nodes: Node[],
  edgeList: Array<{ src: number; tgt: number; w: number }>,
  iters: number,
) {
  const REPEL = 800;
  const SPRING = 0.02;
  const DAMPING = 0.85;
  const CENTER_PULL = 0.005;

  for (let i = 0; i < iters; i += 1) {
    // Repulsion O(n^2) — OK para n ≤ 60.
    for (let a = 0; a < nodes.length; a += 1) {
      const na = nodes[a];
      if (!na) continue;
      for (let b = a + 1; b < nodes.length; b += 1) {
        const nb = nodes[b];
        if (!nb) continue;
        const dx = nb.x - na.x;
        const dy = nb.y - na.y;
        const distSq = dx * dx + dy * dy + 1;
        const force = REPEL / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        na.vx -= fx;
        na.vy -= fy;
        nb.vx += fx;
        nb.vy += fy;
      }
    }
    // Spring attraction.
    for (const e of edgeList) {
      const src = nodes[e.src];
      const tgt = nodes[e.tgt];
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const restLength = 80;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const stretch = dist - restLength;
      const fx = (dx / dist) * stretch * SPRING * (e.w / 100);
      const fy = (dy / dist) * stretch * SPRING * (e.w / 100);
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }
    // Center pull + damping + integrate.
    for (const n of nodes) {
      if (n.isSource) continue; // pin source
      n.vx -= n.x * CENTER_PULL;
      n.vy -= n.y * CENTER_PULL;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }
  }
}

export function ConstellationGraph({
  sourceColoniaId,
  sourceLabel,
  edges,
  clusters,
  customWeights,
  width = 640,
  height = 480,
}: ConstellationGraphProps) {
  const t = useTranslations('Constellations.graph');

  const clusterById = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clusters) {
      for (const mem of c.members) m.set(mem.zone_id, c.cluster_id);
    }
    return m;
  }, [clusters]);

  const { nodes, edgeList } = useMemo(() => {
    const idToIdx = new Map<string, number>();
    const ns: Node[] = [];
    // Source node center.
    ns.push({
      id: sourceColoniaId,
      label: sourceLabel,
      cluster: clusterById.get(sourceColoniaId) ?? 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      isSource: true,
      degree: edges.length,
    });
    idToIdx.set(sourceColoniaId, 0);

    for (const e of edges) {
      if (idToIdx.has(e.target_colonia_id)) continue;
      const angle = (Math.random() * 2 - 1) * Math.PI;
      const radius = 120 + Math.random() * 80;
      ns.push({
        id: e.target_colonia_id,
        label: e.target_label,
        cluster: clusterById.get(e.target_colonia_id) ?? 0,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        isSource: false,
        degree: 1,
      });
      idToIdx.set(e.target_colonia_id, ns.length - 1);
    }

    const el: Array<{ src: number; tgt: number; w: number }> = [];
    for (const e of edges) {
      const srcIdx = idToIdx.get(e.source_colonia_id);
      const tgtIdx = idToIdx.get(e.target_colonia_id);
      if (srcIdx === undefined || tgtIdx === undefined) continue;
      const w = applyCustomEdgeWeight(e.edge_types, customWeights);
      el.push({ src: srcIdx, tgt: tgtIdx, w });
    }

    simulate(ns, el, 80);
    return { nodes: ns, edgeList: el };
  }, [edges, sourceColoniaId, sourceLabel, clusterById, customWeights]);

  // Compute viewbox from final positions.
  const { minX, minY, w, h } = useMemo(() => {
    let xMin = -200;
    let xMax = 200;
    let yMin = -200;
    let yMax = 200;
    for (const n of nodes) {
      if (n.x < xMin) xMin = n.x;
      if (n.x > xMax) xMax = n.x;
      if (n.y < yMin) yMin = n.y;
      if (n.y > yMax) yMax = n.y;
    }
    const padding = 40;
    return {
      minX: xMin - padding,
      minY: yMin - padding,
      w: xMax - xMin + padding * 2,
      h: yMax - yMin + padding * 2,
    };
  }, [nodes]);

  if (nodes.length <= 1) {
    return (
      <p
        role="status"
        className="rounded-lg border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text-secondary)]"
      >
        {t('empty')}
      </p>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`${minX} ${minY} ${w} ${h}`}
        width={width}
        height={height}
        role="img"
        aria-label={t('aria_label')}
        className="overflow-visible rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)]"
      >
        <title>{t('aria_label')}</title>
        <g>
          {edgeList.map((e) => {
            const src = nodes[e.src];
            const tgt = nodes[e.tgt];
            if (!src || !tgt) return null;
            const opacity = 0.25 + (e.w / 100) * 0.5;
            const strokeWidth = 0.6 + (e.w / 100) * 1.8;
            return (
              <line
                key={`edge-${src.id}-${tgt.id}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="var(--color-text-muted)"
                strokeOpacity={opacity}
                strokeWidth={strokeWidth}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            const r = n.isSource ? 10 : 6 + Math.min(n.degree, 3);
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={clusterColor(n.cluster)}
                  stroke="var(--color-surface-raised)"
                  strokeWidth={1.5}
                >
                  <title>{n.label ?? t('unlabeled_zone')}</title>
                </circle>
                <text
                  x={n.x}
                  y={n.y + r + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--color-text-primary)"
                  className="pointer-events-none"
                >
                  {(n.label ?? '').slice(0, 18)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default ConstellationGraph;
