'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import {
  type KpiKey,
  SLA_AVG_RESPONSE_MIN,
  SLA_FIRST_RESPONSE_MIN,
  tierForValue,
} from '@/features/estadisticas/lib/thresholds';
import type { SemaforoTier } from '@/features/estadisticas/schemas';
import { Card, cn } from '@/shared/ui/primitives/canon';

export type KpiFormat = 'number' | 'percent' | 'minutes' | 'currency-mxn';

export interface KpiCardWithPedagogyProps {
  readonly kpiKey: KpiKey;
  readonly value: number | null;
  readonly format?: KpiFormat;
  readonly suffix?: string;
  readonly onClickPedagogy?: () => void;
}

const NUMBER_FMT = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const CURRENCY_FMT = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

function formatValue(value: number, format: KpiFormat): string {
  if (format === 'percent') return `${value.toFixed(1)}%`;
  if (format === 'minutes') return `${value.toFixed(0)} min`;
  if (format === 'currency-mxn') return CURRENCY_FMT.format(value);
  return NUMBER_FMT.format(value);
}

const TIER_DOT_COLOR: Record<SemaforoTier, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
};

const TIER_DOT_GLOW: Record<SemaforoTier, string> = {
  green: '0 0 0 4px rgba(34, 197, 94, 0.18)',
  yellow: '0 0 0 4px rgba(245, 158, 11, 0.18)',
  red: '0 0 0 4px rgba(239, 68, 68, 0.18)',
};

function slaForKpi(kpiKey: KpiKey): number | null {
  if (kpiKey === 'firstResponseTime') return SLA_FIRST_RESPONSE_MIN;
  if (kpiKey === 'avgResponseTime') return SLA_AVG_RESPONSE_MIN;
  return null;
}

export function KpiCardWithPedagogy({
  kpiKey,
  value,
  format = 'number',
  suffix,
  onClickPedagogy,
}: KpiCardWithPedagogyProps) {
  const t = useTranslations('estadisticas.kpi');
  const tier: SemaforoTier = tierForValue(kpiKey, value);
  const display = value === null ? '—' : `${formatValue(value, format)}${suffix ?? ''}`;
  const label = t(`${kpiKey}.label`);
  const sla = slaForKpi(kpiKey);
  const tierLabel = t(`tier.${tier}`);
  const ariaLabel = `${label}: ${display}. ${tierLabel}.`;

  const interactive = typeof onClickPedagogy === 'function';

  const cardStyle: CSSProperties = {
    padding: '20px',
    cursor: interactive ? 'pointer' : 'default',
  };

  const dotStyle: CSSProperties = {
    width: '10px',
    height: '10px',
    borderRadius: '9999px',
    background: TIER_DOT_COLOR[tier],
    boxShadow: TIER_DOT_GLOW[tier],
    flexShrink: 0,
  };

  const valueStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '32px',
    lineHeight: '1.1',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--canon-cream)',
    letterSpacing: '-0.01em',
  };

  const labelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--canon-cream-2)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  };

  const slaStyle: CSSProperties = {
    fontSize: '11px',
    color: 'var(--canon-cream-3)',
    fontVariantNumeric: 'tabular-nums',
  };

  const handleClick = () => {
    if (interactive) onClickPedagogy?.();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClickPedagogy?.();
    }
  };

  return (
    <Card
      variant="elevated"
      hoverable={interactive}
      role={interactive ? 'button' : 'group'}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKey}
      style={cardStyle}
      data-kpi-key={kpiKey}
      data-tier={tier}
      className={cn('canon-kpi-card')}
    >
      <div className="flex items-start justify-between gap-3">
        <span style={labelStyle}>{label}</span>
        <span aria-hidden="true" style={dotStyle} data-tier-dot={tier} />
      </div>
      <div className="mt-3" style={valueStyle}>
        {display}
      </div>
      {sla !== null ? (
        <div className="mt-2" style={slaStyle}>
          {t('sla_prefix', { minutes: sla })}
        </div>
      ) : null}
    </Card>
  );
}
