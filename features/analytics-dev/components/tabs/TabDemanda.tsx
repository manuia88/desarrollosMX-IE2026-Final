'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';
import { DisclosureBadge } from '../DisclosureBadge';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface Props {
  readonly proyectoId: string;
}

export function TabDemanda({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.demanda');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const q = trpc.analyticsDev.getDemandHeatmap.useQuery(
    { proyectoId, radiusKm: 3 },
    { retry: false },
  );

  useEffect(() => {
    if (!q.data?.center || !MAPBOX_TOKEN) return;
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;
    (async () => {
      const mod = await import('mapbox-gl');
      if (disposed) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const center = q.data?.center;
      if (!center) return;
      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [center.lng, center.lat],
        zoom: 13,
        attributionControl: true,
        dragRotate: false,
      });
      map.on('load', () => {
        const features = (q.data?.points ?? []).map((p) => ({
          type: 'Feature' as const,
          properties: { intensity: p.intensity },
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        }));
        map.addSource('demand', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });
        map.addLayer({
          id: 'demand-heat',
          type: 'heatmap',
          source: 'demand',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
            'heatmap-intensity': 1.2,
            'heatmap-radius': 35,
            'heatmap-opacity': 0.7,
          },
        });
        map.addLayer({
          id: 'project-pin',
          type: 'circle',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [center.lng, center.lat] },
              properties: {},
            },
          },
          paint: {
            'circle-color': '#facc15',
            'circle-radius': 10,
            'circle-stroke-color': '#92400e',
            'circle-stroke-width': 2,
          },
        });
      });
      cleanup = () => map.remove();
    })();
    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [q.data]);

  if (q.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (q.error)
    return (
      <Card className="p-4">
        <p className="text-sm text-rose-700">{q.error.message}</p>
      </Card>
    );
  if (!q.data) return null;

  const { kpis, matches, disclosure } = q.data;
  const formatPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('mapTitle')}</h2>
          <DisclosureBadge disclosure={disclosure} />
        </header>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Kpi label={t('kpis.searches')} value={String(kpis.busquedas_activas)} />
          <Kpi label={t('kpis.matches')} value={String(kpis.matches_potenciales)} />
          <Kpi label={t('kpis.matchRate')} value={formatPct(kpis.match_rate_pct)} />
        </div>
        {q.data.center && MAPBOX_TOKEN ? (
          <div
            ref={containerRef}
            role="img"
            aria-label={t('mapAria')}
            className="h-[420px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]"
          />
        ) : (
          <div className="grid h-[280px] place-items-center rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-subtle)] text-sm text-[color:var(--color-text-secondary)]">
            {!q.data.center ? t('noCenter') : t('noToken')}
          </div>
        )}
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">{t('matchesTitle')}</h3>
        {matches.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('noMatches')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {matches.map((m) => (
              <li
                key={m.busquedaId}
                className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] p-2"
              >
                <p className="font-medium">@{m.ownerSlug}</p>
                <p className="text-[color:var(--color-text-secondary)]">{m.resumen}</p>
                <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
                  {t('matchScore', { score: m.score.toFixed(2) })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-2">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
