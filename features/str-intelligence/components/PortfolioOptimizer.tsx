'use client';

// STUB — activar UI real en FASE 20 Portal Asesor.
// Backend listo: trpc.strPortfolio.optimize (greedy + efficient frontier 10 puntos).
// Consumer previsto: /asesor/str/portfolio-optimizer + chart efficient frontier + PDF.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface PortfolioOptimizerProps {
  readonly budgetTotalMinor: number;
  readonly currency?: string;
}

export function PortfolioOptimizer({
  budgetTotalMinor,
  currency = 'MXN',
}: PortfolioOptimizerProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Portfolio Optimizer + Efficient Frontier</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Greedy con constraints (budget, max_listings/zone, min_cap_rate, max_risk). Backend en{' '}
        <code>trpc.strPortfolio.optimize</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Budget: {(budgetTotalMinor / 100).toLocaleString()} {currency} · Risk-return chart + PDF
        export cableados en FASE 20.
      </p>
    </Card>
  );
}
