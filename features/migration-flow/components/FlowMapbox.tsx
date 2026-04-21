'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { cn } from '@/shared/ui/primitives/cn';
import type { MigrationFlowMapPoint } from '../types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const CDMX_CENTER: readonly [number, number] = [-99.1332, 19.4326];
const DEFAULT_ZOOM = 10;

const MIN_LINE_WIDTH = 1;
const MAX_LINE_WIDTH = 8;

export interface FlowMapboxProps {
  readonly points: readonly MigrationFlowMapPoint[];
  readonly className?: string;
}

interface ResolvedPoint {
  readonly origin_scope_id: string;
  readonly dest_scope_id: string;
  readonly origin_centroid: readonly [number, number];
  readonly dest_centroid: readonly [number, number];
  readonly volume: number;
  readonly income_decile_dest: number | null;
}

function decileToColor(decile: number | null): string {
  const clamped = decile === null ? 5 : Math.max(1, Math.min(10, decile));
  const hue = 20 + ((clamped - 1) / 9) * 280;
  return `oklch(0.62 0.19 ${hue.toFixed(1)})`;
}

function scaleLineWidth(volume: number, maxVolume: number): number {
  if (maxVolume <= 0) return MIN_LINE_WIDTH;
  const ratio = Math.min(1, volume / maxVolume);
  return MIN_LINE_WIDTH + ratio * (MAX_LINE_WIDTH - MIN_LINE_WIDTH);
}

function hasCentroids(p: MigrationFlowMapPoint): p is MigrationFlowMapPoint & {
  readonly origin_centroid: readonly [number, number];
  readonly dest_centroid: readonly [number, number];
} {
  return (
    Array.isArray(p.origin_centroid) &&
    p.origin_centroid.length === 2 &&
    Array.isArray(p.dest_centroid) &&
    p.dest_centroid.length === 2
  );
}

function bezierPath(origin: readonly [number, number], dest: readonly [number, number]): string {
  const [ox, oy] = origin;
  const [dx, dy] = dest;
  const cx = (ox + dx) / 2;
  const cy = Math.min(oy, dy) - Math.abs(dx - ox) * 0.3;
  return `M ${ox} ${oy} Q ${cx} ${cy} ${dx} ${dy}`;
}

export function FlowMapbox({ points, className }: FlowMapboxProps) {
  const t = useTranslations('MigrationFlow');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  const resolved = useMemo<readonly ResolvedPoint[]>(
    () =>
      points.filter(hasCentroids).map((p) => ({
        origin_scope_id: p.origin_scope_id,
        dest_scope_id: p.dest_scope_id,
        origin_centroid: p.origin_centroid,
        dest_centroid: p.dest_centroid,
        volume: p.volume,
        income_decile_dest: p.income_decile_dest,
      })),
    [points],
  );

  const hasToken = MAPBOX_TOKEN.length > 0;
  const maxVolume = useMemo(
    () => resolved.reduce((acc, p) => Math.max(acc, p.volume), 0),
    [resolved],
  );

  useEffect(() => {
    if (!hasToken) return;
    const container = containerRef.current;
    if (!container || resolved.length === 0) return;

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

      const addLayers = () => {
        for (const [index, p] of resolved.entries()) {
          const sourceId = `flow-src-${index}`;
          const layerId = `flow-line-${index}`;
          const feature = {
            type: 'Feature' as const,
            properties: {
              volume: p.volume,
              income_decile_dest: p.income_decile_dest,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                p.origin_centroid as [number, number],
                p.dest_centroid as [number, number],
              ],
            },
          };

          map.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [feature] },
          });

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': decileToColor(p.income_decile_dest),
              'line-width': scaleLineWidth(p.volume, maxVolume),
              'line-opacity': 0.75,
            },
          });
        }
      };

      if (map.loaded()) {
        addLayers();
      } else {
        map.on('load', addLayers);
      }

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [hasToken, resolved, maxVolume]);

  if (points.length === 0) {
    return (
      <Card3D
        className={cn(
          'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-8 text-center',
          className,
        )}
        role="status"
      >
        <p className="text-[color:var(--color-text-secondary)]">{t('empty')}</p>
      </Card3D>
    );
  }

  return (
    <Card3D
      className={cn(
        'space-y-3 rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-4',
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-[color:var(--color-text-primary)]">
        {t('mapTitle')}
      </h2>
      {hasToken && resolved.length > 0 ? (
        <section
          ref={containerRef}
          aria-label={t('aria_map')}
          className="h-[420px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]"
        />
      ) : resolved.length > 0 ? (
        <svg
          viewBox="-100 -100 200 200"
          preserveAspectRatio="xMidYMid meet"
          className="h-[420px] w-full rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)]"
          aria-label={t('aria_map')}
          role="img"
        >
          <title>{t('mapTitle')}</title>
          {resolved.map((p) => (
            <path
              key={`${p.origin_scope_id}->${p.dest_scope_id}`}
              d={bezierPath(
                [p.origin_centroid[0], -p.origin_centroid[1]],
                [p.dest_centroid[0], -p.dest_centroid[1]],
              )}
              stroke={decileToColor(p.income_decile_dest)}
              strokeWidth={scaleLineWidth(p.volume, maxVolume)}
              fill="none"
              strokeOpacity={0.75}
              strokeLinecap="round"
            />
          ))}
        </svg>
      ) : (
        <div
          role="status"
          className="flex h-[420px] items-center justify-center rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)]"
        >
          <p className="text-[color:var(--color-text-secondary)]">{t('empty')}</p>
        </div>
      )}
    </Card3D>
  );
}
