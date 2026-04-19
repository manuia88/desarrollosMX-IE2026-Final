'use client';

// STUB — activar UI real en FASE 20 Portal Comprador + Portal Admin.
// Backend listo: trpc.strReports.{request, list, getStatus}.
// Consumer previsto: 4 tiers UI separadas:
//   tier 1 portal-comprador/propiedades/[id] (individual owner)
//   tier 2 admin/marketplaces (alcaldía)
//   tier 3 admin/gobierno (CDMX anual)
//   tier 4 dev-portal/api-access (broker API)

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export type StrReportTier = 1 | 2 | 3 | 4;

export interface StrReportRequestProps {
  readonly tier: StrReportTier;
  readonly countryCode: string;
}

const TIER_LABELS: Record<StrReportTier, string> = {
  1: 'Tier 1 · Individual Owner',
  2: 'Tier 2 · Alcaldía',
  3: 'Tier 3 · Gobierno CDMX',
  4: 'Tier 4 · API Broker',
};

export function StrReportRequest({ tier, countryCode }: StrReportRequestProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">STR Intelligence Report Request</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {TIER_LABELS[tier]} · Backend en <code>trpc.strReports.request</code>. PDF rendering vía
        @react-pdf/renderer pendiente install.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Country: {countryCode} · Form scope-builder + status poller cableados en FASE 20.
      </p>
    </Card>
  );
}
