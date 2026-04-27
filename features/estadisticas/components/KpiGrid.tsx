'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import {
  KpiCardWithPedagogy,
  type KpiFormat,
} from '@/features/estadisticas/components/KpiCardWithPedagogy';
import type { KpiKey } from '@/features/estadisticas/lib/thresholds';

export interface KpiGridData {
  readonly firstResponseTime: number | null;
  readonly avgResponseTime: number | null;
  readonly pendingInquiries: number;
  readonly interactionsVolume: number;
  readonly avgSuggestions: number;
  readonly visitRate: number | null;
  readonly offerRate: number | null;
  readonly inventoryActivePct: number | null;
  readonly inventoryTotal: number;
  readonly acmsGenerated: number;
  readonly capturesNew: number;
}

export interface KpiGridProps {
  readonly kpis: KpiGridData;
  readonly onCardClick?: (kpiKey: KpiKey) => void;
}

interface KpiSpec {
  readonly key: KpiKey;
  readonly format: KpiFormat;
}

const QUALITY_KPIS: ReadonlyArray<KpiSpec> = [
  { key: 'firstResponseTime', format: 'minutes' },
  { key: 'avgResponseTime', format: 'minutes' },
];

const OPERATIONS_KPIS: ReadonlyArray<KpiSpec> = [
  { key: 'pendingInquiries', format: 'number' },
  { key: 'interactionsVolume', format: 'number' },
  { key: 'avgSuggestions', format: 'number' },
  { key: 'visitRate', format: 'percent' },
  { key: 'offerRate', format: 'percent' },
  { key: 'inventoryActivePct', format: 'percent' },
  { key: 'inventoryTotal', format: 'number' },
  { key: 'acmsGenerated', format: 'number' },
  { key: 'capturesNew', format: 'number' },
];

function pickValue(kpis: KpiGridData, key: KpiKey): number | null {
  switch (key) {
    case 'firstResponseTime':
      return kpis.firstResponseTime;
    case 'avgResponseTime':
      return kpis.avgResponseTime;
    case 'pendingInquiries':
      return kpis.pendingInquiries;
    case 'interactionsVolume':
      return kpis.interactionsVolume;
    case 'avgSuggestions':
      return kpis.avgSuggestions;
    case 'visitRate':
      return kpis.visitRate;
    case 'offerRate':
      return kpis.offerRate;
    case 'inventoryActivePct':
      return kpis.inventoryActivePct;
    case 'inventoryTotal':
      return kpis.inventoryTotal;
    case 'acmsGenerated':
      return kpis.acmsGenerated;
    case 'capturesNew':
      return kpis.capturesNew;
  }
}

const HEADING_STYLE: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '14px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--canon-cream-2)',
};

export function KpiGrid({ kpis, onCardClick }: KpiGridProps) {
  const t = useTranslations('estadisticas.kpi');

  const renderCard = (spec: KpiSpec) => {
    const handler = onCardClick ? () => onCardClick(spec.key) : undefined;
    return (
      <KpiCardWithPedagogy
        key={spec.key}
        kpiKey={spec.key}
        value={pickValue(kpis, spec.key)}
        format={spec.format}
        {...(handler ? { onClickPedagogy: handler } : {})}
      />
    );
  };

  return (
    <div className="flex flex-col gap-8" data-component="KpiGrid">
      <section aria-labelledby="kpi-grid-quality-heading" className="flex flex-col gap-3">
        <h2 id="kpi-grid-quality-heading" style={HEADING_STYLE}>
          {t('sections.quality')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{QUALITY_KPIS.map(renderCard)}</div>
      </section>

      <section aria-labelledby="kpi-grid-operations-heading" className="flex flex-col gap-3">
        <h2 id="kpi-grid-operations-heading" style={HEADING_STYLE}>
          {t('sections.operations')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OPERATIONS_KPIS.map(renderCard)}
        </div>
      </section>
    </div>
  );
}
