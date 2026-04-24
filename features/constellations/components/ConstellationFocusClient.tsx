'use client';

// BLOQUE 11.R.3 — Constellation focus client orchestrator.
// Compone Graph + Sliders + PathFinder + Loading/Error states.

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EdgeType } from '@/features/constellations/types';
import { trpc } from '@/shared/lib/trpc/client';
import { ConstellationGraph } from './ConstellationGraph';
import { defaultEdgeWeights, EdgeWeightSliders } from './EdgeWeightSliders';
import { PathFinderWidget } from './PathFinderWidget';

interface Props {
  readonly coloniaId: string;
  readonly sourceLabel: string | null;
}

export function ConstellationFocusClient({ coloniaId, sourceLabel }: Props) {
  const t = useTranslations('Constellations.focus');
  const [weights, setWeights] = useState<Record<EdgeType, number>>(defaultEdgeWeights());

  const edgesQuery = trpc.constellations.getEdges.useQuery(
    { coloniaId, minWeight: 30, limit: 50, countryCode: 'MX' },
    { staleTime: 5 * 60 * 1000 },
  );
  const clustersQuery = trpc.constellations.getClusters.useQuery(
    { limitPerCluster: 50, countryCode: 'MX' },
    { staleTime: 5 * 60 * 1000 },
  );

  if (edgesQuery.isLoading || clustersQuery.isLoading) {
    return (
      <output
        aria-busy="true"
        aria-label={t('loading')}
        className="block min-h-[400px] py-6 text-sm text-[color:var(--color-text-secondary)]"
      >
        {t('loading')}
      </output>
    );
  }

  if (edgesQuery.isError) {
    return (
      <p role="alert" className="text-sm text-[color:var(--color-danger)]">
        {t('error')}
      </p>
    );
  }

  const edges = edgesQuery.data ?? [];
  const clusters = clustersQuery.data ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        {edges.length === 0 ? (
          <p className="rounded-lg border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text-secondary)]">
            {t('no_edges')}
          </p>
        ) : (
          <ConstellationGraph
            sourceColoniaId={coloniaId}
            sourceLabel={sourceLabel}
            edges={edges}
            clusters={clusters}
            customWeights={weights}
            width={640}
            height={480}
          />
        )}
      </div>
      <aside className="space-y-4">
        <EdgeWeightSliders
          weights={weights}
          onChange={setWeights}
          onReset={() => setWeights(defaultEdgeWeights())}
        />
        <PathFinderWidget defaultSource={coloniaId} />
      </aside>
    </div>
  );
}

export default ConstellationFocusClient;
