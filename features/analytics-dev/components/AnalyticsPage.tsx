'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';
import { cn } from '@/shared/ui/primitives/cn';

const TABS = [
  'demanda',
  'pricing',
  'absorcion',
  'competencia',
  'pmf',
  'costos',
  'predicciones',
] as const;

export type AnalyticsTab = (typeof TABS)[number];

const TabDemanda = dynamic(() => import('./tabs/TabDemanda').then((m) => m.TabDemanda), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabPricing = dynamic(() => import('./tabs/TabPricing').then((m) => m.TabPricing), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabAbsorcion = dynamic(() => import('./tabs/TabAbsorcion').then((m) => m.TabAbsorcion), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabCompetencia = dynamic(
  () => import('./tabs/TabCompetencia').then((m) => m.TabCompetencia),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const TabPmf = dynamic(() => import('./tabs/TabPmf').then((m) => m.TabPmf), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabCostos = dynamic(() => import('./tabs/TabCostos').then((m) => m.TabCostos), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const TabPredicciones = dynamic(
  () => import('./tabs/TabPredicciones').then((m) => m.TabPredicciones),
  { ssr: false, loading: () => <TabSkeleton /> },
);

function TabSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid h-[480px] place-items-center rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] text-sm text-[color:var(--color-text-secondary)]"
    >
      cargando…
    </div>
  );
}

export function AnalyticsPage() {
  const t = useTranslations('dev.analytics');
  const projectsQ = trpc.analyticsDev.listProjects.useQuery();
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [tab, setTab] = useState<AnalyticsTab>('demanda');

  useEffect(() => {
    if (!proyectoId && projectsQ.data && projectsQ.data.length > 0) {
      setProyectoId(projectsQ.data[0]?.id ?? null);
    }
  }, [projectsQ.data, proyectoId]);

  const projects = projectsQ.data ?? [];
  const selected = useMemo(
    () => projects.find((p) => p.id === proyectoId) ?? null,
    [projects, proyectoId],
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text-primary)]">
            {t('title')}
          </h1>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[color:var(--color-text-secondary)]">{t('selectProject')}</span>
          <select
            className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-sm text-[color:var(--color-text-primary)]"
            value={proyectoId ?? ''}
            onChange={(e) => setProyectoId(e.target.value || null)}
            aria-label={t('selectProject')}
          >
            <option value="">{t('selectProjectPlaceholder')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div
        role="tablist"
        aria-label={t('tablist')}
        className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border-subtle)] pb-2"
      >
        {TABS.map((id) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`analytics-tab-${id}`}
              id={`analytics-tabbtn-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[color:var(--color-accent-mint)] text-[color:var(--color-text-on-accent)]'
                  : 'text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]',
              )}
            >
              {t(`tabs.${id}`)}
            </button>
          );
        })}
      </div>

      {!proyectoId ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('emptyProject')}</p>
        </Card>
      ) : (
        <div
          role="tabpanel"
          id={`analytics-tab-${tab}`}
          aria-labelledby={`analytics-tabbtn-${tab}`}
          className="space-y-4"
        >
          {tab === 'demanda' && <TabDemanda proyectoId={proyectoId} />}
          {tab === 'pricing' && <TabPricing proyectoId={proyectoId} />}
          {tab === 'absorcion' && <TabAbsorcion proyectoId={proyectoId} />}
          {tab === 'competencia' && <TabCompetencia proyectoId={proyectoId} />}
          {tab === 'pmf' && <TabPmf proyectoId={proyectoId} />}
          {tab === 'costos' && <TabCostos proyectoId={proyectoId} />}
          {tab === 'predicciones' && <TabPredicciones proyectoId={proyectoId} />}
        </div>
      )}

      {selected ? (
        <p className="text-xs text-[color:var(--color-text-tertiary)]">
          {t('contextLine', {
            ciudad: selected.ciudad ?? '—',
            colonia: selected.colonia ?? '—',
            disponibles: selected.units_available ?? 0,
            totales: selected.units_total ?? 0,
          })}
        </p>
      ) : null}
    </section>
  );
}
