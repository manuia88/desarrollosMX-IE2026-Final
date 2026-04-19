'use client';

// STUB — activar UI real en FASE 20 Portal Asesor.
// Backend listo: trpc.strBreakeven.compute (financing + stress test + cash-on-cash y1..y5).
// Consumer previsto: /asesor/str/breakeven sliders + waterfall + PDF export.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface BreakevenCalculatorProps {
  readonly marketId: string;
  readonly propertyPriceMinor: number;
}

export function BreakevenCalculator({ marketId, propertyPriceMinor }: BreakevenCalculatorProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Breakeven Calculator (detallado)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Financiamiento Banxico + costs + stress test (occupancy/ADR -10%, rate +200bps). Backend en{' '}
        <code>trpc.strBreakeven.compute</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Market: {marketId} · Price: {(propertyPriceMinor / 100).toLocaleString()} · Sliders +
        waterfall chart cableados en FASE 20.
      </p>
    </Card>
  );
}
