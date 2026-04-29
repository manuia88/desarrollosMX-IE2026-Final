'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function AICreditsBalance() {
  const t = useTranslations('dev.documents.credits');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = trpc.documentIntel.getMyCreditsBalance.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || !data) {
    return (
      <span
        className="inline-flex h-9 items-center rounded-full px-3 text-xs"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream-3)',
        }}
        aria-busy="true"
      >
        {t('balance')}…
      </span>
    );
  }

  const balance = data.balance_usd;
  const isEmpty = balance <= 0;
  const formatted = CURRENCY_FORMATTER.format(balance);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs transition-all duration-[var(--canon-duration-fast)] hover:-translate-y-px"
        style={
          isEmpty
            ? {
                background: 'rgba(245, 158, 11, 0.10)',
                border: '1px solid rgba(245, 158, 11, 0.40)',
                color: 'rgb(252, 211, 77)',
              }
            : {
                background: 'var(--gradient-ai)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                boxShadow: 'var(--shadow-canon-spotlight)',
              }
        }
        aria-label={isEmpty ? t('no_balance') : `${t('balance')}: ${formatted}`}
      >
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ opacity: 0.85 }}>
          {t('balance')}
        </span>
        {isEmpty ? (
          <span className="font-semibold">{t('zero_short')}</span>
        ) : (
          <span
            className="font-extrabold"
            style={{
              fontFamily: 'var(--font-display)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatted}
          </span>
        )}
      </button>

      {modalOpen ? (
        <RechargeModal
          balance={balance}
          consumed={data.total_consumed_usd}
          purchased={data.total_purchased_usd}
          packAvailable={data.pack_available ?? false}
          packPriceUsd={data.pack_price_usd ?? 25}
          packCreditsAddedUsd={data.pack_credits_added_usd ?? 25}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}

interface RechargeModalProps {
  readonly balance: number;
  readonly consumed: number;
  readonly purchased: number;
  readonly packAvailable: boolean;
  readonly packPriceUsd: number;
  readonly packCreditsAddedUsd: number;
  readonly onClose: () => void;
}

function RechargeModal({
  balance,
  consumed,
  purchased,
  packAvailable,
  packPriceUsd,
  packCreditsAddedUsd,
  onClose,
}: RechargeModalProps) {
  const t = useTranslations('dev.documents.credits');
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutMutation = trpc.documentIntel.createCreditsCheckoutSession.useMutation({
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (err) => {
      setRedirecting(false);
      setError(err.message ?? 'checkout_failed');
    },
  });

  const handleRecharge = (): void => {
    if (!packAvailable || redirecting) return;
    setError(null);
    setRedirecting(true);
    checkoutMutation.mutate({});
  };

  const packLabel = `${t('buy_pack_button')} — ${CURRENCY_FORMATTER.format(packPriceUsd)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-credits-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{
          background: 'var(--canon-bg-elevated, #14171f)',
          borderColor: 'rgba(255,255,255,0.10)',
          color: 'var(--canon-cream)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h2
          id="ai-credits-modal-title"
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('buy_pack')}
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--canon-cream-3)' }}>
          {packAvailable
            ? t('pack_description', {
                price: CURRENCY_FORMATTER.format(packPriceUsd),
                credits: CURRENCY_FORMATTER.format(packCreditsAddedUsd),
              })
            : t('pack_unavailable')}
        </p>

        <dl
          className="mt-5 grid grid-cols-3 gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Stat label={t('balance')} value={CURRENCY_FORMATTER.format(balance)} />
          <Stat label={t('consumed')} value={CURRENCY_FORMATTER.format(consumed)} />
          <Stat label={t('purchased')} value={CURRENCY_FORMATTER.format(purchased)} />
        </dl>

        {error ? (
          <p role="alert" className="mt-4 text-xs" style={{ color: 'rgb(252, 165, 165)' }}>
            {t('checkout_error')}: {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-[34px] rounded-full px-4 text-xs"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'var(--canon-cream)',
            }}
          >
            {t('close')}
          </button>
          <button
            type="button"
            onClick={handleRecharge}
            disabled={!packAvailable || redirecting}
            aria-disabled={!packAvailable || redirecting}
            className="h-[34px] rounded-full px-5 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--gradient-ai)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.20)',
              boxShadow: 'var(--shadow-canon-spotlight)',
              cursor: !packAvailable || redirecting ? 'not-allowed' : 'pointer',
            }}
          >
            {redirecting ? t('redirecting_to_stripe') : packLabel}
          </button>
        </div>

        {!packAvailable ? (
          <p
            className="mt-3 text-[10px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('pack_pending_setup')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </dt>
      <dd
        className="text-sm font-semibold"
        style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--canon-cream)' }}
      >
        {value}
      </dd>
    </div>
  );
}
