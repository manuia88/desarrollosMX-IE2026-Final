'use client';

import { useCurrency } from '@/shared/hooks/useCurrency';
import { useFX } from '@/shared/hooks/useFX';
import { useLocale } from '@/shared/hooks/useLocale';
import { formatCurrency } from '@/shared/lib/i18n/formatters';
import { cn } from '../primitives/cn';

type FxPillProps = {
  amount: number;
  currency: string;
  className?: string;
};

export function FxPill({ amount, currency, className }: FxPillProps) {
  const locale = useLocale();
  const { currency: preferredCurrency } = useCurrency();
  const shouldConvert = preferredCurrency !== currency;
  const { data, isLoading } = useFX(amount, currency, preferredCurrency, {
    enabled: shouldConvert,
  });

  if (!shouldConvert) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]',
        className,
      )}
      aria-live="polite"
    >
      {isLoading || !data ? '…' : `≈ ${formatCurrency(data.amount, preferredCurrency, locale)}`}
    </span>
  );
}
