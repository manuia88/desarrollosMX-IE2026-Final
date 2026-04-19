'use client';

// STUB — activar UI real en FASE 20 Portal Admin.
// Backend listo: trpc.invisibleHotels.{scan, list, reviewCluster, exportCsv}.
// Consumer previsto: /admin/str/invisible-hotels map + manual review queue + export.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface InvisibleHotelAdminPanelProps {
  readonly countryCode: string;
}

export function InvisibleHotelAdminPanel({ countryCode }: InvisibleHotelAdminPanelProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Invisible Hotels Admin (compliance)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Clusters ≥5 listings/host en radio ≤200m. Manual review queue antes de export gobierno.
        Backend en <code>trpc.invisibleHotels.list</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Country: {countryCode} · Map Mapbox + drawer review + CSV download cableados en FASE 20.
      </p>
    </Card>
  );
}
