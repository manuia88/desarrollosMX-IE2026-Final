'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { ContractDrawer } from './ContractDrawer';
import { ContractGenerateModal } from './ContractGenerateModal';

interface AsesorContractsPanelProps {
  operacionId: string;
}

export function AsesorContractsPanel({ operacionId }: AsesorContractsPanelProps) {
  const t = useTranslations('dev.contracts');
  const [showGenerate, setShowGenerate] = useState(false);
  const [openContractId, setOpenContractId] = useState<string | null>(null);

  const { data, isLoading } = trpc.contracts.listMyContracts.useQuery({ operacionId });

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('asesor.title')}</h2>
        <button
          type="button"
          onClick={() => setShowGenerate(true)}
          className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white"
        >
          {t('asesor.generate')}
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('list.loading')}</p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-[color:var(--color-text-secondary)]">
          {t('asesor.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpenContractId(c.id)}
                className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-sm font-medium">{t(`type.${c.contract_type}`)}</span>
                  <span className="block text-xs text-[color:var(--color-text-secondary)]">
                    {t(`status.${c.status}`)} · {Array.isArray(c.signers) ? c.signers.length : 0}{' '}
                    {t('asesor.signers')}
                  </span>
                </span>
                <span className="text-xs text-[color:var(--color-text-secondary)]">
                  {new Date(c.created_at).toLocaleDateString('es-MX')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showGenerate ? (
        <ContractGenerateModal
          operacionId={operacionId}
          onClose={() => setShowGenerate(false)}
          onSuccess={(id) => {
            setShowGenerate(false);
            setOpenContractId(id);
          }}
        />
      ) : null}

      {openContractId ? (
        <ContractDrawer contractId={openContractId} onClose={() => setOpenContractId(null)} />
      ) : null}
    </section>
  );
}
