'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import {
  type FiltersState,
  InventarioFilters,
} from '@/features/developer/components/inventario/InventarioFilters';
import { InventarioMetrics } from '@/features/developer/components/inventario/InventarioMetrics';
import { UnitDrawer } from '@/features/developer/components/inventario/UnitDrawer';
import { UnitGrid } from '@/features/developer/components/inventario/UnitGrid';
import { UnitTable } from '@/features/developer/components/inventario/UnitTable';
import { UnitTimelineView } from '@/features/developer/components/inventario/UnitTimelineView';
import { useRealtimeUnits } from '@/features/developer/hooks/use-realtime-units';
import type { InventarioUnidadRow, ViewMode } from '@/features/developer/schemas';
import { trpc } from '@/shared/lib/trpc/client';

interface InventarioPageProps {
  locale: string;
}

export function InventarioPage({ locale }: InventarioPageProps) {
  const t = useTranslations('dev.inventario');
  const [filters, setFilters] = useState<FiltersState>({});
  const [view, setView] = useState<ViewMode>('grid');
  const [drawerUnit, setDrawerUnit] = useState<string | null>(null);

  const proyectosQ = trpc.developer.inventarioListProyectos.useQuery();
  const proyectos = proyectosQ.data ?? [];

  const utils = trpc.useUtils();

  const listInput = useMemo(
    () => ({
      ...(filters.proyectoId ? { proyectoId: filters.proyectoId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tipo ? { tipo: filters.tipo } : {}),
      ...(filters.priceMin !== undefined ? { priceMin: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { priceMax: filters.priceMax } : {}),
      ...(filters.m2Min !== undefined ? { m2Min: filters.m2Min } : {}),
      ...(filters.m2Max !== undefined ? { m2Max: filters.m2Max } : {}),
      ...(filters.recamaras !== undefined ? { recamaras: filters.recamaras } : {}),
      limit: 50,
    }),
    [filters],
  );

  const listQ = trpc.developer.inventarioListUnidades.useInfiniteQuery(listInput, {
    getNextPageParam: (last) => last.nextCursor,
    initialCursor: undefined,
  });

  const allRows = useMemo<InventarioUnidadRow[]>(
    () =>
      (listQ.data?.pages ?? []).flatMap((p) =>
        p.rows.map((r) => ({
          ...r,
          demand_color: (r.demand_color ?? null) as InventarioUnidadRow['demand_color'],
        })),
      ),
    [listQ.data],
  );

  const heatmapEnabled = filters.proyectoId != null;
  const heatmapQ = trpc.developer.getUnitDemandHeatmap.useQuery(
    { proyectoId: filters.proyectoId ?? '' },
    { enabled: heatmapEnabled, retry: false },
  );

  const demandSignalsMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown> | null>();
    for (const item of heatmapQ.data ?? []) {
      m.set(item.unitId, item.signals);
    }
    return m;
  }, [heatmapQ.data]);

  const metricsQ = trpc.developer.inventarioMetrics.useQuery(
    filters.proyectoId ? { proyectoId: filters.proyectoId } : {},
  );

  useRealtimeUnits({
    proyectoId: filters.proyectoId ?? null,
    enabled: filters.proyectoId != null,
    onChange: () => {
      utils.developer.inventarioListUnidades.invalidate();
      utils.developer.inventarioMetrics.invalidate();
      if (filters.proyectoId) {
        utils.developer.getUnitDemandHeatmap.invalidate({ proyectoId: filters.proyectoId });
      }
    },
  });

  const handleOpen = useCallback((unitId: string) => setDrawerUnit(unitId), []);
  const handleClose = useCallback(() => setDrawerUnit(null), []);
  const handleLoadMore = useCallback(() => {
    if (listQ.hasNextPage && !listQ.isFetchingNextPage) listQ.fetchNextPage();
  }, [listQ]);

  if (proyectosQ.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
      </div>
    );
  }
  if (proyectos.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-white/70">{t('empty.noProjects')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h1
              className="font-display text-3xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('title')}
            </h1>
            <p className="text-sm text-white/60">{t('subtitle')}</p>
          </div>
        </div>

        <nav aria-label={t('subnav.ariaLabel')} className="flex flex-wrap gap-2">
          {[
            { href: `/${locale}/desarrolladores/inventario`, key: 'unidades' },
            { href: `/${locale}/desarrolladores/inventario/prototipos`, key: 'prototipos' },
            { href: `/${locale}/desarrolladores/inventario/esquemas-pago`, key: 'esquemasPago' },
            { href: `/${locale}/desarrolladores/inventario/avance-obra`, key: 'avanceObra' },
          ].map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                it.key === 'unidades'
                  ? 'border-violet-400/40 bg-violet-600/20 text-violet-100'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {t(`subnav.${it.key}`)}
            </Link>
          ))}
        </nav>
      </header>

      <InventarioMetrics
        metrics={metricsQ.data ?? null}
        isLoading={metricsQ.isLoading}
        locale={locale}
      />

      <InventarioFilters
        proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        filters={filters}
        onChange={setFilters}
      />

      <ViewToggle view={view} onChange={setView} />

      {listQ.isLoading ? (
        <p className="text-sm text-white/60" role="status">
          {t('list.loading')}
        </p>
      ) : listQ.isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4">
          <p className="text-sm text-rose-200">{t('list.errorTitle')}</p>
          <button
            type="button"
            onClick={() => listQ.refetch()}
            className="mt-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white"
          >
            {t('list.errorRetry')}
          </button>
        </div>
      ) : allRows.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
          {t('empty.noUnits')}
        </p>
      ) : view === 'grid' ? (
        <UnitGrid
          units={allRows}
          demandSignalsMap={demandSignalsMap}
          onOpen={handleOpen}
          hasMore={Boolean(listQ.hasNextPage)}
          onLoadMore={handleLoadMore}
          isFetchingMore={listQ.isFetchingNextPage}
          locale={locale}
        />
      ) : view === 'table' ? (
        <UnitTable
          units={allRows}
          onOpen={handleOpen}
          hasMore={Boolean(listQ.hasNextPage)}
          onLoadMore={handleLoadMore}
          isFetchingMore={listQ.isFetchingNextPage}
          locale={locale}
        />
      ) : (
        <UnitTimelineView units={allRows} onOpen={handleOpen} locale={locale} />
      )}

      <UnitDrawer unidadId={drawerUnit} onClose={handleClose} locale={locale} />
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const t = useTranslations('dev.inventario.view');
  const opts: ViewMode[] = ['grid', 'table', 'timeline'];
  return (
    <fieldset
      aria-label={t('ariaToggle')}
      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1"
    >
      {opts.map((v) => (
        // biome-ignore lint/a11y/useSemanticElements: toggle group canon DMX (button + role=radio inside fieldset)
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            view === v ? 'bg-violet-600/85 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          {t(v)}
        </button>
      ))}
    </fieldset>
  );
}
