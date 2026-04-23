'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';
import { Area, AreaChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { cn } from '@/shared/ui/primitives/cn';
import { usePulseHistory } from '../hooks/usePulseScore';
import type { PulseHistoryPoint, PulseScopeType } from '../types';
import { VitalSigns } from './VitalSigns';

export interface VitalSignsComparisonScope {
  readonly scopeType: PulseScopeType;
  readonly scopeId: string;
  readonly country?: string;
}

export interface VitalSignsComparisonProps {
  readonly scopeA: VitalSignsComparisonScope;
  readonly scopeB: VitalSignsComparisonScope;
  readonly className?: string;
  readonly months?: number;
}

interface CombinedRow {
  readonly period_date: string;
  readonly pulse_a: number | null;
  readonly pulse_b: number | null;
}

function toMap(points: ReadonlyArray<PulseHistoryPoint>): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const p of points) {
    m.set(p.period_date, p.pulse_score);
  }
  return m;
}

function mergeSeries(
  a: ReadonlyArray<PulseHistoryPoint>,
  b: ReadonlyArray<PulseHistoryPoint>,
): CombinedRow[] {
  const mapA = toMap(a);
  const mapB = toMap(b);
  const allDates = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
  return allDates.map((d) => ({
    period_date: d,
    pulse_a: mapA.get(d) ?? null,
    pulse_b: mapB.get(d) ?? null,
  }));
}

export function VitalSignsComparison({
  scopeA,
  scopeB,
  className,
  months = 12,
}: VitalSignsComparisonProps) {
  const t = useTranslations('Pulse');
  const tCmp = useTranslations('IndicesPublic');

  const labelA = useMemo(
    () => resolveZoneLabelSync({ scopeType: scopeA.scopeType, scopeId: scopeA.scopeId }),
    [scopeA.scopeType, scopeA.scopeId],
  );
  const labelB = useMemo(
    () => resolveZoneLabelSync({ scopeType: scopeB.scopeType, scopeId: scopeB.scopeId }),
    [scopeB.scopeType, scopeB.scopeId],
  );

  const historyA = usePulseHistory({
    scopeType: scopeA.scopeType,
    scopeId: scopeA.scopeId,
    ...(scopeA.country !== undefined ? { country: scopeA.country } : {}),
    months,
  });
  const historyB = usePulseHistory({
    scopeType: scopeB.scopeType,
    scopeId: scopeB.scopeId,
    ...(scopeB.country !== undefined ? { country: scopeB.country } : {}),
    months,
  });

  const combined = useMemo<CombinedRow[]>(() => {
    const dataA: ReadonlyArray<PulseHistoryPoint> = historyA.data ?? [];
    const dataB: ReadonlyArray<PulseHistoryPoint> = historyB.data ?? [];
    return mergeSeries(dataA, dataB);
  }, [historyA.data, historyB.data]);

  const gradA = useId();
  const gradB = useId();

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const cardClass = cn(
    'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6',
  );

  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-label={tCmp('compare.aria_label', { zoneA: labelA, zoneB: labelB })}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4, 1rem)',
        }}
      >
        <section aria-label={tCmp('compare.panel_a_label', { zone: labelA })}>
          <p
            style={{
              margin: '0 0 var(--space-2, 0.5rem) 0',
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-text-secondary, #475569)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--color-accent-primary, oklch(0.67 0.19 285))',
                marginRight: 6,
                verticalAlign: 'middle',
              }}
            />
            {labelA}
          </p>
          <VitalSigns
            scopeType={scopeA.scopeType}
            scopeId={scopeA.scopeId}
            {...(scopeA.country !== undefined ? { country: scopeA.country } : {})}
          />
        </section>
        <section aria-label={tCmp('compare.panel_b_label', { zone: labelB })}>
          <p
            style={{
              margin: '0 0 var(--space-2, 0.5rem) 0',
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-text-secondary, #475569)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--color-accent-secondary, oklch(0.72 0.18 40))',
                marginRight: 6,
                verticalAlign: 'middle',
              }}
            />
            {labelB}
          </p>
          <VitalSigns
            scopeType={scopeB.scopeType}
            scopeId={scopeB.scopeId}
            {...(scopeB.country !== undefined ? { country: scopeB.country } : {})}
          />
        </section>
      </div>

      <Card3D
        className={cardClass}
        aria-label={tCmp('compare.chart_aria', { zoneA: labelA, zoneB: labelB })}
      >
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary, #0f172a)',
            }}
          >
            {tCmp('compare.chart_title')}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm, 0.875rem)',
              color: 'var(--color-text-secondary, #475569)',
            }}
          >
            {tCmp('compare.chart_subtitle')}
          </p>
        </header>
        {combined.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: 'var(--space-4, 1rem)',
              textAlign: 'center',
              color: 'var(--color-text-secondary, #475569)',
              fontSize: 'var(--text-sm, 0.875rem)',
            }}
          >
            {t('empty_state')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={combined} margin={{ top: 8, right: 8, bottom: 16, left: 4 }}>
              <defs>
                <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent-primary, oklch(0.67 0.19 285))"
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent-primary, oklch(0.67 0.19 285))"
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent-secondary, oklch(0.72 0.18 40))"
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent-secondary, oklch(0.72 0.18 40))"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="period_date"
                tickFormatter={(v: string) => v.slice(0, 7)}
                stroke="var(--color-text-muted, #94a3b8)"
                fontSize={10}
                minTickGap={24}
              />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-raised, #ffffff)',
                  border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--color-text-secondary, #475569)' }}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary, #475569)' }}
              />
              <Area
                type="monotone"
                dataKey="pulse_a"
                name={labelA}
                stroke="var(--color-accent-primary, oklch(0.67 0.19 285))"
                strokeWidth={2}
                fill={`url(#${gradA})`}
                connectNulls={false}
                isAnimationActive={!prefersReducedMotion}
              />
              <Area
                type="monotone"
                dataKey="pulse_b"
                name={labelB}
                stroke="var(--color-accent-secondary, oklch(0.72 0.18 40))"
                strokeWidth={2}
                fill={`url(#${gradB})`}
                connectNulls={false}
                isAnimationActive={!prefersReducedMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card3D>
    </section>
  );
}
