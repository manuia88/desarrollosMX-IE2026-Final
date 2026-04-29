'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export function CommitteePage() {
  const t = useTranslations('dev.moonshots.committee');
  const [thesis, setThesis] = useState('');
  const utils = trpc.useUtils();

  const listQuery = trpc.developerMoonshots.listCommitteeReports.useQuery(
    { limit: 20 },
    { staleTime: 30_000 },
  );
  const mutation = trpc.developerMoonshots.generateCommitteeReport.useMutation({
    onSuccess: () => {
      setThesis('');
      void utils.developerMoonshots.listCommitteeReports.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
          {t('costNote')} · {t('quotaPro')} · {t('quotaEnterprise')}
        </span>
      </header>

      <Card className="space-y-3 p-6">
        <label className="flex flex-col gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            Tesis del comité
          </span>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={5}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--canon-cream)',
            }}
          />
        </label>
        <Button
          type="button"
          variant="primary"
          disabled={thesis.trim().length < 10 || mutation.isPending}
          onClick={() => mutation.mutate({ thesisSummary: thesis.trim() })}
        >
          {mutation.isPending ? '...' : t('generateCta')}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--canon-cream)' }}>
          Reportes recientes
        </h2>
        {listQuery.data && listQuery.data.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {listQuery.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: 'var(--canon-cream)' }}>
                    {r.thesisSummary}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                    {new Date(r.createdAt).toLocaleString('es-MX')} · USD{' '}
                    {r.costUsd?.toFixed(2) ?? '0.00'}
                  </div>
                </div>
                {r.pdfUrl ? (
                  <a
                    href={r.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full px-3 py-1 text-[12px] font-semibold"
                    style={{
                      background: 'linear-gradient(90deg, #6366F1, #EC4899)',
                      color: '#fff',
                    }}
                  >
                    PDF
                  </a>
                ) : (
                  <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                    sin PDF
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--canon-cream-3)' }}>
            Sin reportes generados aún.
          </p>
        )}
      </Card>
    </div>
  );
}
