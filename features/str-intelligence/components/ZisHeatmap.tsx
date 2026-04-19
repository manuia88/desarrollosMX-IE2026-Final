'use client';

// STUB — activar UI real en FASE 20 Portal Comprador.
// Backend listo: trpc.zoneInvestment.get (ZIS composite + sentiment + momentum).
// Consumer previsto: portal-comprador/zonas mapa + ficha proyecto sidebar.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface ZisHeatmapProps {
  readonly countryCode: string;
}

export function ZisHeatmap({ countryCode }: ZisHeatmapProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Zone Investment Score (ZIS)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Heatmap de ZIS composite (baseline + cap_rate + LTR + sentiment + momentum). Backend
        operativo en <code>trpc.zoneInvestment.get</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Country scope: {countryCode} · Render mapa Mapbox cableado en FASE 20.
      </p>
    </Card>
  );
}
