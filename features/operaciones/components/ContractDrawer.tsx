'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type {
  ContractAuditEvent,
  ContractProvider,
  PreFilledContractData,
} from '@/shared/lib/contracts';
import { trpc } from '@/shared/lib/trpc/client';

const TABS = ['details', 'signers', 'preFill', 'audit', 'pdfs'] as const;
type TabId = (typeof TABS)[number];

interface ContractDrawerProps {
  contractId: string;
  onClose: () => void;
}

export function ContractDrawer({ contractId, onClose }: ContractDrawerProps) {
  const t = useTranslations('dev.contracts');
  const [tab, setTab] = useState<TabId>('details');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const utils = trpc.useUtils();
  const { data: contract, isLoading } = trpc.contracts.getContractStatus.useQuery({ contractId });
  const send = trpc.contracts.sendForSignature.useMutation({
    onSuccess: async () => {
      await utils.contracts.getContractStatus.invalidate({ contractId });
      await utils.contracts.listMyContracts.invalidate();
      setShowSendModal(false);
    },
  });
  const cancel = trpc.contracts.cancelContract.useMutation({
    onSuccess: async () => {
      await utils.contracts.getContractStatus.invalidate({ contractId });
      await utils.contracts.listMyContracts.invalidate();
      setShowCancelModal(false);
    },
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('drawer.title')}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[color:var(--color-surface-base)] p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t('drawer.title')}</h2>
            {contract ? (
              <p className="text-xs text-[color:var(--color-text-secondary)]">
                {t(`type.${contract.contract_type}`)} · {t(`status.${contract.status}`)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('drawer.close')}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs hover:bg-white/[0.1]"
          >
            ×
          </button>
        </header>

        <span className="inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100">
          {t('drawer.stubBadge')}
        </span>

        <nav aria-label={t('drawer.title')} className="flex flex-wrap gap-2">
          {TABS.map((id) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                tab === id
                  ? 'border-violet-400/40 bg-violet-600/20 text-violet-100'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {t(`drawer.tab.${id}`)}
            </button>
          ))}
        </nav>

        {isLoading || !contract ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('drawer.loading')}</p>
        ) : (
          <div className="space-y-4 text-sm">
            {tab === 'details' ? <DetailsTab contract={contract} /> : null}
            {tab === 'signers' ? <SignersTab signers={contract.signers} /> : null}
            {tab === 'preFill' ? (
              <PreFillTab data={contract.pre_filled_data as PreFilledContractData} />
            ) : null}
            {tab === 'audit' ? <AuditTab trail={contract.audit_trail} /> : null}
            {tab === 'pdfs' ? (
              <PdfTab unsigned={contract.pdf_unsigned_url} signed={contract.pdf_signed_url} />
            ) : null}
          </div>
        )}

        {contract ? (
          <footer className="mt-auto flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {contract.status === 'draft' ? (
              <button
                type="button"
                onClick={() => setShowSendModal(true)}
                className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white"
              >
                {t('drawer.action.send')}
              </button>
            ) : null}
            {contract.status !== 'signed' && contract.status !== 'cancelled' ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100"
              >
                {t('drawer.action.cancel')}
              </button>
            ) : null}
          </footer>
        ) : null}

        {showSendModal ? (
          <SendModal
            onClose={() => setShowSendModal(false)}
            onConfirm={(provider) => send.mutate({ contractId, provider })}
            isLoading={send.isPending}
          />
        ) : null}
        {showCancelModal ? (
          <CancelModal
            onClose={() => setShowCancelModal(false)}
            onConfirm={(reason) => cancel.mutate({ contractId, reason })}
            isLoading={cancel.isPending}
          />
        ) : null}
      </div>
    </div>
  );
}

interface ContractRowLite {
  id: string;
  contract_type: string;
  status: string;
  signers: unknown;
  pre_filled_data: unknown;
  audit_trail: unknown;
  pdf_unsigned_url: string | null;
  pdf_signed_url: string | null;
  template_version: string | null;
  mifiel_doc_id: string | null;
  docusign_envelope_id: string | null;
  sent_at: string | null;
  signed_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

function DetailsTab({ contract }: { contract: ContractRowLite }) {
  const t = useTranslations('dev.contracts');
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <Row label={t('drawer.kv.template')} value={contract.template_version ?? '—'} />
      <Row label={t('drawer.kv.mifielId')} value={contract.mifiel_doc_id ?? '—'} />
      <Row label={t('drawer.kv.docusignId')} value={contract.docusign_envelope_id ?? '—'} />
      <Row label={t('drawer.kv.sentAt')} value={contract.sent_at ?? '—'} />
      <Row label={t('drawer.kv.signedAt')} value={contract.signed_at ?? '—'} />
      <Row label={t('drawer.kv.cancellation')} value={contract.cancellation_reason ?? '—'} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[color:var(--color-text-secondary)]">{label}</dt>
      <dd className="break-all font-mono text-[11px]">{value}</dd>
    </>
  );
}

function SignersTab({ signers }: { signers: unknown }) {
  const t = useTranslations('dev.contracts');
  const list = Array.isArray(signers) ? signers : [];
  if (list.length === 0) {
    return <p className="text-[color:var(--color-text-secondary)]">{t('drawer.noSigners')}</p>;
  }
  return (
    <ul className="space-y-2">
      {list.map((s, i) => {
        const sig = s as { role: string; name: string; email: string; phone?: string | null };
        const key = `${sig.email || 'unknown'}-${sig.role || 'role'}-${i}`;
        return (
          <li
            key={key}
            className="rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-3"
          >
            <p className="font-medium">{sig.name}</p>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              {t(`signerRole.${sig.role}`)} · {sig.email}
              {sig.phone ? ` · ${sig.phone}` : ''}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function PreFillTab({ data }: { data: PreFilledContractData }) {
  const t = useTranslations('dev.contracts');
  if (!data?.montos) {
    return <p className="text-[color:var(--color-text-secondary)]">{t('drawer.noPreFill')}</p>;
  }
  return (
    <div className="space-y-3 text-xs">
      <Block title={t('drawer.kv.unidad')}>
        <p>
          {data.unidad.proyecto_nombre ?? '—'} · {data.unidad.numero ?? '—'} ·{' '}
          {fmtMxn(data.unidad.price_mxn)}
        </p>
      </Block>
      <Block title={t('drawer.kv.esquema')}>
        <p>
          {data.esquema.nombre} · {data.esquema.enganche_pct}% + {data.esquema.mensualidades_count}{' '}
          MSI + {data.esquema.contra_entrega_pct}%
        </p>
      </Block>
      <Block title={t('drawer.kv.montos')}>
        <ul className="grid grid-cols-2 gap-1">
          <li>
            {t('drawer.kv.enganche')}: {fmtMxn(data.montos.enganche_mxn)}
          </li>
          <li>
            {t('drawer.kv.contraEntrega')}: {fmtMxn(data.montos.contra_entrega_mxn)}
          </li>
          <li>
            {t('drawer.kv.mensualidad')}: {fmtMxn(data.montos.mensualidad_mxn)}
          </li>
          <li>
            {t('drawer.kv.comision')}: {fmtMxn(data.montos.comision_asesor_mxn)}
          </li>
          <li>
            {t('drawer.kv.iva')}: {fmtMxn(data.montos.iva_mxn)}
          </li>
          <li>
            {t('drawer.kv.total')}: {fmtMxn(data.montos.total_mxn)}
          </li>
        </ul>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-[color:var(--color-text-secondary)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function AuditTab({ trail }: { trail: unknown }) {
  const t = useTranslations('dev.contracts');
  const events = (Array.isArray(trail) ? (trail as ContractAuditEvent[]) : [])
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  if (events.length === 0) {
    return <p className="text-[color:var(--color-text-secondary)]">{t('drawer.noAudit')}</p>;
  }
  return (
    <ol className="space-y-2 border-l border-white/10 pl-4">
      {events.map((e) => (
        <li key={`${e.timestamp}-${e.event}-${e.actor_id ?? 'sys'}`} className="text-xs">
          <p className="font-medium">{t(`audit.${e.event}`)}</p>
          <p className="text-[color:var(--color-text-secondary)]">{e.timestamp}</p>
        </li>
      ))}
    </ol>
  );
}

function PdfTab({ unsigned, signed }: { unsigned: string | null; signed: string | null }) {
  const t = useTranslations('dev.contracts');
  return (
    <div className="space-y-2 text-xs">
      <div>
        <p className="text-[color:var(--color-text-secondary)]">{t('drawer.pdfUnsigned')}</p>
        {unsigned ? (
          <a
            href={unsigned}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-300 underline"
          >
            {t('drawer.openPdf')}
          </a>
        ) : (
          <span>—</span>
        )}
      </div>
      <div>
        <p className="text-[color:var(--color-text-secondary)]">{t('drawer.pdfSigned')}</p>
        {signed ? (
          <a
            href={signed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-300 underline"
          >
            {t('drawer.openPdf')}
          </a>
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
  );
}

function fmtMxn(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function SendModal({
  onClose,
  onConfirm,
  isLoading,
}: {
  onClose: () => void;
  onConfirm: (provider: ContractProvider) => void;
  isLoading: boolean;
}) {
  const t = useTranslations('dev.contracts');
  const [provider, setProvider] = useState<ContractProvider>('mifiel');
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--color-surface-base)] p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h3 className="mb-2 text-lg font-semibold">{t('sendModal.title')}</h3>
        <p className="mb-4 text-xs text-[color:var(--color-text-secondary)]">
          {t('sendModal.description')}
        </p>
        <fieldset className="mb-4 space-y-2">
          {(['mifiel', 'docusign'] as const).map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-3 ${
                provider === p
                  ? 'border-violet-400/60 bg-violet-600/15'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={provider === p}
                onChange={() => setProvider(p)}
              />
              <div>
                <p className="text-sm font-medium">{t(`sendModal.provider.${p}.label`)}</p>
                <p className="text-[11px] text-[color:var(--color-text-secondary)]">
                  {t(`sendModal.provider.${p}.note`)}
                </p>
              </div>
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs"
          >
            {t('sendModal.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(provider)}
            disabled={isLoading}
            className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? t('sendModal.submitting') : t('sendModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  onClose,
  onConfirm,
  isLoading,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const t = useTranslations('dev.contracts');
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 10;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--color-surface-base)] p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h3 className="mb-2 text-lg font-semibold">{t('cancelModal.title')}</h3>
        <p className="mb-3 text-xs text-[color:var(--color-text-secondary)]">
          {t('cancelModal.description')}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          minLength={10}
          maxLength={500}
          placeholder={t('cancelModal.placeholder')}
          className="mb-4 w-full rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] p-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs"
          >
            {t('cancelModal.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={!valid || isLoading}
            className="rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-xs text-rose-100 disabled:opacity-40"
          >
            {isLoading ? t('cancelModal.submitting') : t('cancelModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
