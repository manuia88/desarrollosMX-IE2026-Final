'use client';

// STUB — activar UI real en FASE 20 Portal Comprador.
// Backend listo: trpc.strViability.getForProperty (cap_rate, breakeven, net_revenue).
// Consumer previsto: portal-comprador/propiedades/[id] ficha proyecto.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface StrViabilityCardProps {
  readonly marketId: string;
  readonly propertyPriceMinor: number;
  readonly currency?: string;
}

export function StrViabilityCard({ propertyPriceMinor, currency = 'MXN' }: StrViabilityCardProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">STR Investment Viability</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Calculadora de cap_rate + breakeven_months + net_revenue_annual. Backend operativo en{' '}
        <code>trpc.strViability.getForProperty</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Property: {(propertyPriceMinor / 100).toLocaleString()} {currency} · UI completo se cablea
        en FASE 20 Portal Comprador.
      </p>
    </Card>
  );
}
