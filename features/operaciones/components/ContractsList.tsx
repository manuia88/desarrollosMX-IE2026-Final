'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { ContractStatus } from '@/shared/lib/contracts';
import { trpc } from '@/shared/lib/trpc/client';
import { ContractDrawer } from './ContractDrawer';

const STATUS_FILTERS: ReadonlyArray<ContractStatus | 'all'> = [
  'all',
  'draft',
  'sent',
  'viewed',
  'signed',
  'cancelled',
  'expired',
];

const STATUS_TONES: Record<ContractStatus, string> = {
  draft: 'border-white/15 bg-white/[0.05] text-white/80',
  sent: 'border-violet-400/40 bg-violet-600/15 text-violet-100',
  viewed: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
  signed: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  cancelled: 'border-rose-400/40 bg-rose-500/15 text-rose-100',
  expired: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
};

export function ContractsList() {
  const t = useTranslations('dev.contracts');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [openContractId, setOpenContractId] = useState<string | null>(null);

  const listInput = useMemo(
    () => (statusFilter === 'all' ? {} : { status: statusFilter }),
    [statusFilter],
  );
  const { data: contracts, isLoading } = trpc.contracts.listMyContracts.useQuery(listInput);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text-primary)]">
            {t('list.title')}
          </h1>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('list.subtitle')}</p>
        </div>
      </header>

      <div role="tablist" aria-label={t('list.filterLabel')} className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            type="button"
            key={s}
            role="tab"
            aria-selected={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              statusFilter === s
                ? 'border-violet-400/40 bg-violet-600/20 text-violet-100'
                : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            }`}
          >
            {t(`list.filter.${s}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-2 text-left">{t('list.col.type')}</th>
              <th className="px-4 py-2 text-left">{t('list.col.operacion')}</th>
              <th className="px-4 py-2 text-left">{t('list.col.signers')}</th>
              <th className="px-4 py-2 text-left">{t('list.col.status')}</th>
              <th className="px-4 py-2 text-left">{t('list.col.created')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[color:var(--color-text-secondary)]"
                >
                  {t('list.loading')}
                </td>
              </tr>
            ) : !contracts || contracts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[color:var(--color-text-secondary)]"
                >
                  {t('list.empty')}
                </td>
              </tr>
            ) : (
              contracts.map((c) => {
                const status = c.status as ContractStatus;
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.04]"
                    onClick={() => setOpenContractId(c.id)}
                  >
                    <td className="px-4 py-3 font-medium">{t(`type.${c.contract_type}`)}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-text-secondary)]">
                      {c.operacion_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{Array.isArray(c.signers) ? c.signers.length : 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${STATUS_TONES[status] ?? STATUS_TONES.draft}`}
                      >
                        {t(`status.${status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-text-secondary)]">
                      {new Date(c.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {openContractId ? (
        <ContractDrawer contractId={openContractId} onClose={() => setOpenContractId(null)} />
      ) : null}
    </section>
  );
}
