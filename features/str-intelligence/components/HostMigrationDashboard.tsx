'use client';

// STUB — activar UI real en FASE 20 Portal Admin.
// Backend listo: trpc.hostMigrations.{scan, list, marketAlertPct}.
// Consumer previsto: /admin/str/migrations dashboard + alert badge por market.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface HostMigrationDashboardProps {
  readonly countryCode: string;
}

export function HostMigrationDashboard({ countryCode }: HostMigrationDashboardProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Host Migration Dashboard (admin)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Cross-platform migrations (Airbnb→VRBO/Booking) por firma + alert pct regulatorio por
        market. Backend en <code>trpc.hostMigrations.list</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Country: {countryCode} · Tabla + filtros por market + KG GC-18 wiring en FASE 20.
      </p>
    </Card>
  );
}
