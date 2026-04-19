'use client';

// STUB — activar UI real en FASE 20 Portal Asesor.
// Backend listo: trpc.strPricing.suggest (90 días) + setOverride / getOverrides.
// Consumer previsto: /asesor/str/pricing calendar + edit override drawer.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface PricingCalendarProps {
  readonly marketId: string;
  readonly startDate: string;
  readonly forecastDays?: number;
}

export function PricingCalendar({ marketId, startDate, forecastDays = 90 }: PricingCalendarProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Dynamic Pricing Calendar (90d)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Calendar 90d con suggested_price diario + event multipliers + lead time bumps. Backend en{' '}
        <code>trpc.strPricing.suggest</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Market: {marketId} · Start: {startDate} · Forecast: {forecastDays}d · Override editor
        cableado en FASE 20.
      </p>
    </Card>
  );
}
