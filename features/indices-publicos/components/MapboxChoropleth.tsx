'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import {
  bandToLabelPillTone,
  resolveScoreBand,
  type ScopeType,
  type ScoreBand,
} from '../lib/index-registry-helpers';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const CDMX_CENTER: readonly [number, number] = [-99.1332, 19.4326];
const DEFAULT_ZOOM = 10;

export interface ChoroplethRow {
  readonly scope_id: string;
  readonly value: number;
  readonly score_band: string | null;
  readonly ranking_in_scope: number | null;
  readonly centroid?: readonly [number, number] | null;
}

export interface MapboxChoroplethProps {
  readonly rows: readonly ChoroplethRow[];
  readonly scopeType: ScopeType;
  readonly className?: string;
  readonly onSelectScope?: (scopeId: string) => void;
}

function isScoreBand(value: string | null): value is ScoreBand {
  return value === 'excelente' || value === 'bueno' || value === 'regular' || value === 'bajo';
}

function interpolateRedGreen(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  const hue = clamped * 1.2;
  return `oklch(0.7 0.17 ${hue.toFixed(1)})`;
}

export function MapboxChoropleth({
  rows,
  scopeType,
  className,
  onSelectScope,
}: MapboxChoroplethProps) {
  const t = useTranslations('IndicesPublic');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  const geoRows = useMemo(
    () =>
      rows.filter(
        (r): r is ChoroplethRow & { readonly centroid: readonly [number, number] } =>
          Array.isArray(r.centroid) && r.centroid.length === 2,
      ),
    [rows],
  );

  const hasToken = MAPBOX_TOKEN.length > 0;

  useEffect(() => {
    if (!hasToken) return;
    const container = containerRef.current;
    if (!container || geoRows.length === 0) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const mapboxModule = await import('mapbox-gl');
      if (disposed) return;
      const mapboxgl = mapboxModule.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/light-v11',
        center: CDMX_CENTER as [number, number],
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
        dragRotate: false,
        pitchWithRotate: false,
      });

      if (prefersReducedMotion) {
        map.scrollZoom.disable();
      }

      mapRef.current = map;
      const markers: mapboxgl.Marker[] = [];

      const addMarkers = () => {
        for (const row of geoRows) {
          const band = isScoreBand(row.score_band) ? row.score_band : resolveScoreBand(row.value);
          const color = interpolateRedGreen(row.value);
          const el = document.createElement('button');
          el.type = 'button';
          el.setAttribute('aria-label', `${row.scope_id}: ${row.value.toFixed(1)}`);
          el.style.width = '22px';
          el.style.height = '22px';
          el.style.borderRadius = '50%';
          el.style.background = color;
          el.style.border = '2px solid white';
          el.style.cursor = onSelectScope ? 'pointer' : 'default';
          el.style.padding = '0';
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

          if (onSelectScope) {
            el.addEventListener('click', () => onSelectScope(row.scope_id));
          }

          const popupHtml = `
            <div style="font-family: var(--font-sans, system-ui); font-size: 12px; min-width: 140px;">
              <strong>${row.scope_id}</strong><br/>
              ${t('detail.value_label')}: ${row.value.toFixed(1)}<br/>
              #${row.ranking_in_scope ?? '—'} ${t(`scope.${scopeType}_plural`)}<br/>
              <span style="color:${color}">${t(`band.${band}`)}</span>
            </div>
          `;

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(row.centroid as [number, number])
            .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(popupHtml))
            .addTo(map);
          markers.push(marker);
        }
      };

      if (map.loaded()) {
        addMarkers();
      } else {
        map.on('load', addMarkers);
      }

      cleanup = () => {
        for (const marker of markers) marker.remove();
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [hasToken, geoRows, onSelectScope, scopeType, t]);

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center',
          className,
        )}
        role="status"
      >
        <p className="text-[color:var(--color-text-secondary)]">{t('page.empty')}</p>
      </div>
    );
  }

  return (
    <section
      className={cn('space-y-4', className)}
      aria-label={`${t('page.scope_label')}: ${t(`scope.${scopeType}_plural`)}`}
    >
      {hasToken && geoRows.length > 0 ? (
        <div
          ref={containerRef}
          className="h-[420px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]"
        />
      ) : null}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      >
        {rows.map((row) => {
          const band = isScoreBand(row.score_band) ? row.score_band : resolveScoreBand(row.value);
          return (
            <Card3D
              key={row.scope_id}
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[color:var(--color-text-secondary)] tabular-nums">
                  #{row.ranking_in_scope ?? '—'}
                </span>
                <LabelPill tone={bandToLabelPillTone(band)} size="sm">
                  {t(`band.${band}`)}
                </LabelPill>
              </div>
              <div className="mt-2 text-sm font-semibold text-[color:var(--color-text-primary)] truncate">
                {row.scope_id}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--color-text-primary)]">
                {row.value.toFixed(1)}
              </div>
            </Card3D>
          );
        })}
      </div>
    </section>
  );
}
