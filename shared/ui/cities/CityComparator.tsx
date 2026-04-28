'use client';

// ADR-059 — Cities comparator (canon ADR-050 visual language).
// Compares 2-3 cities simultaneously across KPIs.

import { type CSSProperties, useEffect, useState } from 'react';
import { type CitySettings, getCitySettings } from '@/shared/lib/cities/registry';
import { Card } from '@/shared/ui/primitives/canon';

export interface CityComparatorKpis {
  readonly precioPromedioM2: number | null;
  readonly trend30dPct: number | null;
  readonly zonesCount: number;
  readonly projectsCount: number;
  readonly topZones: ReadonlyArray<string>;
}

export interface CityComparatorLabels {
  readonly title?: string;
  readonly precioM2?: string;
  readonly tendencia?: string;
  readonly zones?: string;
  readonly projects?: string;
  readonly topZones?: string;
  readonly noData?: string;
}

export interface CityComparatorProps {
  readonly citySlugs: ReadonlyArray<string>;
  readonly locale: string;
  readonly kpisFetcher?: (slug: string) => Promise<CityComparatorKpis>;
  readonly initialKpis?: Readonly<Record<string, CityComparatorKpis>>;
  readonly labels?: CityComparatorLabels;
}

interface KpiState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly data: CityComparatorKpis | null;
}

function resolveCityName(city: CitySettings, locale: string): string {
  const isEn = locale.toLowerCase().startsWith('en');
  switch (city.slug) {
    case 'cdmx':
      return isEn ? 'Mexico City' : 'Ciudad de México';
    case 'playa-del-carmen':
      return 'Playa del Carmen';
    case 'guadalajara':
      return 'Guadalajara';
    case 'queretaro':
      return isEn ? 'Queretaro' : 'Querétaro';
    case 'dubai':
      return isEn ? 'Dubai' : 'Dubái';
    default:
      return city.slug;
  }
}

function formatPrice(value: number | null, currency: string): string {
  if (value === null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString('en-US')} ${currency}`;
  }
}

function formatTrend(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function CityComparator({
  citySlugs,
  locale,
  kpisFetcher,
  initialKpis,
  labels,
}: CityComparatorProps): React.ReactElement {
  const slugs = citySlugs.slice(0, 3);
  const [kpisMap, setKpisMap] = useState<Record<string, KpiState>>(() => {
    const init: Record<string, KpiState> = {};
    for (const slug of slugs) {
      const seed = initialKpis?.[slug];
      init[slug] = seed
        ? { status: 'ready', data: seed }
        : { status: kpisFetcher ? 'loading' : 'ready', data: null };
    }
    return init;
  });

  useEffect(() => {
    if (!kpisFetcher) return;
    let cancelled = false;
    for (const slug of slugs) {
      const existing = initialKpis?.[slug];
      if (existing) continue;
      kpisFetcher(slug)
        .then((data) => {
          if (cancelled) return;
          setKpisMap((prev) => ({ ...prev, [slug]: { status: 'ready', data } }));
        })
        .catch(() => {
          if (cancelled) return;
          setKpisMap((prev) => ({ ...prev, [slug]: { status: 'error', data: null } }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [initialKpis, kpisFetcher, slugs]);

  const titleText = labels?.title ?? 'Compare cities';
  const precioM2Text = labels?.precioM2 ?? 'Average price /m²';
  const tendenciaText = labels?.tendencia ?? '30-day trend';
  const zonesText = labels?.zones ?? 'Zone count';
  const projectsText = labels?.projects ?? 'Project count';
  const topZonesText = labels?.topZones ?? 'Top 3 zones';
  const noDataText = labels?.noData ?? 'No data available';

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${slugs.length || 1}, minmax(0, 1fr))`,
    gap: 16,
    padding: 16,
  };

  const cellTitleStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--canon-cream-2)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  };

  const numericStyle: CSSProperties = {
    fontFamily: 'var(--font-display, var(--font-body))',
    fontWeight: 800,
    fontSize: 20,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--canon-cream)',
  };

  const tableLabelStyle: CSSProperties = {
    fontSize: 11,
    color: 'var(--canon-cream-2)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 12,
  };

  return (
    <section aria-label={titleText} style={{ padding: '12px 0' }}>
      <header style={{ padding: '0 16px 8px 16px' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--canon-cream)',
            fontFamily: 'var(--font-display, var(--font-body))',
          }}
        >
          {titleText}
        </h2>
      </header>
      <div style={containerStyle}>
        {slugs.map((slug) => {
          const settings = getCitySettings(slug);
          const state = kpisMap[slug];
          const cityName = settings ? resolveCityName(settings, locale) : slug;
          const currency = settings?.currency ?? 'MXN';
          if (!settings) {
            return (
              <Card key={slug} variant="recessed" style={{ padding: 16 }}>
                <div style={cellTitleStyle}>{slug}</div>
                <p style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>{noDataText}</p>
              </Card>
            );
          }
          return (
            <Card key={slug} variant="elevated" style={{ padding: 16 }}>
              <div style={cellTitleStyle}>{cityName}</div>
              {state?.status === 'loading' ? (
                <p style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>…</p>
              ) : state?.data ? (
                <>
                  <div style={{ marginTop: 8 }}>
                    <div style={tableLabelStyle}>{precioM2Text}</div>
                    <div style={numericStyle}>
                      {formatPrice(state.data.precioPromedioM2, currency)}
                    </div>
                  </div>
                  <div>
                    <div style={tableLabelStyle}>{tendenciaText}</div>
                    <div style={numericStyle}>{formatTrend(state.data.trend30dPct)}</div>
                  </div>
                  <div>
                    <div style={tableLabelStyle}>{zonesText}</div>
                    <div style={numericStyle}>{state.data.zonesCount.toLocaleString('en-US')}</div>
                  </div>
                  <div>
                    <div style={tableLabelStyle}>{projectsText}</div>
                    <div style={numericStyle}>
                      {state.data.projectsCount.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div>
                    <div style={tableLabelStyle}>{topZonesText}</div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 16,
                        fontSize: 12,
                        color: 'var(--canon-cream)',
                      }}
                    >
                      {state.data.topZones.slice(0, 3).map((zoneName) => (
                        <li key={zoneName}>{zoneName}</li>
                      ))}
                      {state.data.topZones.length === 0 ? <li>{noDataText}</li> : null}
                    </ul>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>{noDataText}</p>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
