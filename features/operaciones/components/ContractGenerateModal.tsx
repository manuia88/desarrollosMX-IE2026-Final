'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import type { ContractSignerInput, ContractTypeInput } from '@/features/operaciones/schemas';
import { trpc } from '@/shared/lib/trpc/client';

interface SignerRow extends ContractSignerInput {
  rowId: string;
}

interface ContractGenerateModalProps {
  operacionId: string;
  onClose: () => void;
  onSuccess: (contractId: string) => void;
}

const CONTRACT_TYPES: ReadonlyArray<ContractTypeInput> = ['aps', 'promesa', 'reserva'];

export function ContractGenerateModal({
  operacionId,
  onClose,
  onSuccess,
}: ContractGenerateModalProps) {
  const t = useTranslations('dev.contracts');
  const baseId = useId();
  const counter = useRef(2);
  const [contractType, setContractType] = useState<ContractTypeInput>('aps');
  const [signers, setSigners] = useState<SignerRow[]>([
    { rowId: `${baseId}-0`, role: 'comprador', name: '', email: '' },
    { rowId: `${baseId}-1`, role: 'asesor', name: '', email: '' },
  ]);

  const utils = trpc.useUtils();
  const generate = trpc.contracts.generateContract.useMutation({
    onSuccess: async (created) => {
      await utils.contracts.listMyContracts.invalidate();
      onSuccess(created.id);
    },
  });

  const valid =
    signers.length >= 1 &&
    signers.every((s) => s.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(s.email));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('generateModal.title')}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--color-surface-base)] p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h3 className="mb-3 text-lg font-semibold">{t('generateModal.title')}</h3>
        <p className="mb-4 text-xs text-[color:var(--color-text-secondary)]">
          {t('generateModal.description')}
        </p>

        <fieldset className="mb-4">
          <legend className="mb-2 text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
            {t('generateModal.typeLegend')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_TYPES.map((ct) => (
              <button
                type="button"
                key={ct}
                onClick={() => setContractType(ct)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  contractType === ct
                    ? 'border-violet-400/40 bg-violet-600/20 text-violet-100'
                    : 'border-white/10 bg-white/[0.04] text-white/70'
                }`}
              >
                {t(`type.${ct}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-4 space-y-2">
          <legend className="mb-1 text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
            {t('generateModal.signersLegend')}
          </legend>
          {signers.map((s, i) => (
            <div
              key={s.rowId}
              className="grid grid-cols-1 gap-2 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-3"
            >
              <select
                value={s.role}
                onChange={(e) =>
                  updateSigner(setSigners, i, {
                    role: e.target.value as ContractSignerInput['role'],
                  })
                }
                className="rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
              >
                {(['comprador', 'vendedor', 'asesor', 'desarrolladora'] as const).map((r) => (
                  <option key={r} value={r}>
                    {t(`signerRole.${r}`)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t('generateModal.namePlaceholder')}
                value={s.name}
                onChange={(e) => updateSigner(setSigners, i, { name: e.target.value })}
                className="rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
              />
              <input
                type="email"
                placeholder={t('generateModal.emailPlaceholder')}
                value={s.email}
                onChange={(e) => updateSigner(setSigners, i, { email: e.target.value })}
                className="rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const id = `${baseId}-${counter.current++}`;
              setSigners((prev) => [
                ...prev,
                { rowId: id, role: 'desarrolladora', name: '', email: '' },
              ]);
            }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs"
          >
            {t('generateModal.addSigner')}
          </button>
        </fieldset>

        {generate.error ? (
          <p className="mb-3 text-xs text-rose-300">{generate.error.message}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs"
          >
            {t('generateModal.cancel')}
          </button>
          <button
            type="button"
            disabled={!valid || generate.isPending}
            onClick={() =>
              generate.mutate({
                operacionId,
                contractType,
                signers: signers.map((s) => ({
                  role: s.role,
                  name: s.name,
                  email: s.email,
                  ...(s.phone ? { phone: s.phone } : {}),
                  ...(s.rfc ? { rfc: s.rfc } : {}),
                  ...(s.party_id ? { party_id: s.party_id } : {}),
                })),
                templateVersion: 'v1',
              })
            }
            className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {generate.isPending ? t('generateModal.submitting') : t('generateModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

function updateSigner(
  setter: React.Dispatch<React.SetStateAction<SignerRow[]>>,
  index: number,
  patch: Partial<ContractSignerInput>,
) {
  setter((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
}
