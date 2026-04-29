'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export function RadarPage() {
  const t = useTranslations('dev.moonshots.radar');
  const [zoneId, setZoneId] = useState('');
  const [thresholdPct, setThresholdPct] = useState(15);
  const [channel, setChannel] = useState<'email' | 'webhook' | 'sms'>('email');

  const utils = trpc.useUtils();
  const subsQuery = trpc.developerMoonshots.listRadarSubscriptions.useQuery();
  const alertsQuery = trpc.developerMoonshots.listRadarAlerts.useQuery({ limit: 50 });

  const subscribe = trpc.developerMoonshots.subscribeRadar.useMutation({
    onSuccess: () => {
      setZoneId('');
      void utils.developerMoonshots.listRadarSubscriptions.invalidate();
    },
  });
  const unsubscribe = trpc.developerMoonshots.unsubscribeRadar.useMutation({
    onSuccess: () => void utils.developerMoonshots.listRadarSubscriptions.invalidate(),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
      </header>

      <Card className="space-y-3 p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              Zone ID
            </span>
            <input
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              placeholder="UUID"
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--canon-cream)',
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              Threshold %
            </span>
            <input
              type="number"
              value={thresholdPct}
              onChange={(e) => setThresholdPct(Number(e.target.value))}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--canon-cream)',
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              Canal
            </span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--canon-cream)',
              }}
            >
              <option value="email">email</option>
              <option value="webhook">webhook</option>
              <option value="sms">sms</option>
            </select>
          </label>
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={zoneId.length !== 36 || subscribe.isPending}
          onClick={() => subscribe.mutate({ zoneId, channel, thresholdPct })}
        >
          {t('subscribeCta')}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          Suscripciones activas
        </h2>
        {subsQuery.data && subsQuery.data.length > 0 ? (
          <ul className="space-y-2">
            {subsQuery.data.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between gap-3 text-sm">
                <span style={{ color: 'var(--canon-cream)' }}>
                  {sub.zoneId.slice(0, 8)}… · {sub.channel} · ≥{sub.thresholdPct}%
                </span>
                <button
                  type="button"
                  onClick={() => unsubscribe.mutate({ subscriptionId: sub.id })}
                  className="rounded-full border px-3 py-1 text-[11px]"
                  style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'var(--canon-cream-2)' }}
                >
                  Pausar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--canon-cream-3)' }}>
            Sin suscripciones aún.
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          Feed de alertas
        </h2>
        <ul className="space-y-2">
          {(alertsQuery.data ?? []).map((alert) => (
            <li key={alert.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span style={{ color: 'var(--canon-cream)' }}>
                Zone {alert.zoneId.slice(0, 8)}… · α={alert.alphaScore.toFixed(0)}
              </span>
              <span style={{ color: 'var(--canon-cream-3)' }}>
                {new Date(alert.detectedAt).toLocaleString('es-MX')}
              </span>
            </li>
          ))}
          {(alertsQuery.data ?? []).length === 0 && (
            <li className="text-sm" style={{ color: 'var(--canon-cream-3)' }}>
              Sin alertas recientes.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
