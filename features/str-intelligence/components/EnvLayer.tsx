'use client';

// STUB — activar UI real en FASE 20 Portal Comprador.
// Backend listo: trpc.env.get (AQI + noise → ENV score).
// Consumer previsto: portal-comprador/zonas mapa overlay + comparador.
// Nota: AQI samples = 0 mientras RAMA SINAICA siga como stub permanente H2.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface EnvLayerProps {
  readonly marketId: string;
}

export function EnvLayer({ marketId }: EnvLayerProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Environmental Layer (AQI + Noise)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Overlay de calidad de aire (SINAICA/RAMA) y ruido (noise topic-share de reviews). Backend en{' '}
        <code>trpc.env.get</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Market: {marketId} · AQI = datos pendientes hasta activación RAMA H2.
      </p>
    </Card>
  );
}
