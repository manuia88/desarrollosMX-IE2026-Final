'use client';

import { useTranslations } from 'next-intl';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

export function PipelinePage() {
  const t = useTranslations('dev.moonshots.pipeline');
  const tCols = useTranslations('dev.moonshots.pipeline.columns');
  const listQuery = trpc.developerMoonshots.listPipelineSnapshots.useQuery(
    { rangeFromDays: 30 },
    { staleTime: 30_000 },
  );

  const rows = listQuery.data ?? [];

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

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Th>{tCols('proyecto')}</Th>
              <Th>{tCols('zona')}</Th>
              <Th>{tCols('avance')}</Th>
              <Th>{tCols('absorcion')}</Th>
              <Th>{tCols('precio')}</Th>
              <Th>{tCols('dmxScore')}</Th>
              <Th>{tCols('trustScore')}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-center text-[12px]"
                  style={{ color: 'var(--canon-cream-3)' }}
                >
                  Sin snapshots aún. El cron diario poblará datos.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.proyectoId} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <Td>{r.proyectoNombre}</Td>
                  <Td>{r.zoneId ?? '—'}</Td>
                  <Td>{r.avanceObraPct ?? '—'}</Td>
                  <Td>
                    {r.absorcionActual?.toFixed(1) ?? '—'}{' '}
                    {r.absorcionDeltaPct !== null && (
                      <span style={{ color: r.absorcionDeltaPct < -10 ? '#fca5a5' : '#86efac' }}>
                        ({r.absorcionDeltaPct.toFixed(1)}%)
                      </span>
                    )}
                  </Td>
                  <Td>${r.precioM2Mxn?.toLocaleString('es-MX') ?? '—'}</Td>
                  <Td>{r.dmxScore?.toFixed(0) ?? '—'}</Td>
                  <Td>{r.trustScore?.toFixed(0) ?? '—'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          {t('alertsTitle')}
        </h2>
        <ul className="space-y-2">
          {rows
            .flatMap((r) =>
              r.alerts.map((a) => ({ ...a, proyecto: r.proyectoNombre, proyectoId: r.proyectoId })),
            )
            .slice(0, 20)
            .map((a) => (
              <li
                key={`${a.proyectoId}-${a.type}-${a.severity}`}
                className="text-[13px]"
                style={{ color: 'var(--canon-cream-2)' }}
              >
                <span
                  className="mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background:
                      a.severity === 'critical'
                        ? 'rgba(248,113,113,0.18)'
                        : a.severity === 'warning'
                          ? 'rgba(251,191,36,0.18)'
                          : 'rgba(99,102,241,0.18)',
                    color:
                      a.severity === 'critical'
                        ? '#fca5a5'
                        : a.severity === 'warning'
                          ? '#fbbf24'
                          : '#a5b4fc',
                  }}
                >
                  {a.severity}
                </span>
                <span className="font-medium">{a.proyecto}</span> — {a.message}
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.18em]"
      style={{ color: 'var(--canon-cream-3)' }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2" style={{ color: 'var(--canon-cream)' }}>
      {children}
    </td>
  );
}
