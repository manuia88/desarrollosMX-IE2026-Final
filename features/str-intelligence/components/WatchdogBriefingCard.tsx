'use client';

// STUB — activar UI real en FASE 20 Portal Admin.
// Backend listo: trpc.strWatchdog.scanMarkets (anomalías nightly).
// Consumer previsto: /admin/dashboard summary card + alert panel.

import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';

export interface WatchdogBriefingCardProps {
  readonly countryCode: string;
}

export function WatchdogBriefingCard({ countryCode }: WatchdogBriefingCardProps) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">STR Watchdog Briefing (admin)</h3>
        <Badge variant="stub">Próximamente · FASE 20</Badge>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Anomalías MoM: ADR drop {'>'} 30%, occupancy drop {'>'} 20%, listings drop {'>'} 15%.
        Backend en <code>trpc.strWatchdog.scanMarkets</code>.
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Country: {countryCode} · Severity badges + drill-down por market cableados en FASE 20.
      </p>
    </Card>
  );
}
