'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement, useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

const AUTO_DISMISS_MS = 6000;

export function CreditsRechargeToast(): ReactElement | null {
  const t = useTranslations('dev.documents.credits');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const utils = trpc.useUtils();

  const charged = params?.get('credits_charged') === 'true';
  const canceled = params?.get('credits_canceled') === 'true';
  const visible = charged || canceled;

  const [open, setOpen] = useState(visible);

  useEffect(() => {
    if (!visible) return;
    setOpen(true);
    if (charged) {
      void utils.documentIntel.getMyCreditsBalance.invalidate();
    }
    const timer = setTimeout(() => {
      setOpen(false);
      const next = new URLSearchParams(params?.toString() ?? '');
      next.delete('credits_charged');
      next.delete('credits_canceled');
      next.delete('session_id');
      next.delete('stub_session');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, charged, pathname, params, router, utils]);

  if (!open) return null;

  const message = charged ? t('recharge_success') : t('recharge_canceled');
  const tone = charged ? 'success' : 'warning';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-4 z-40 mx-auto w-full max-w-md px-4"
    >
      <div
        className="rounded-2xl border px-4 py-3 text-sm shadow-lg"
        style={{
          background:
            tone === 'success'
              ? 'linear-gradient(90deg, rgba(99,102,241,0.18), rgba(236,72,153,0.18))'
              : 'rgba(245, 158, 11, 0.10)',
          borderColor: tone === 'success' ? 'rgba(255,255,255,0.18)' : 'rgba(245, 158, 11, 0.40)',
          color: tone === 'success' ? 'var(--canon-cream)' : 'rgb(252, 211, 77)',
          boxShadow: 'var(--shadow-canon-spotlight)',
        }}
      >
        {message}
      </div>
    </div>
  );
}
