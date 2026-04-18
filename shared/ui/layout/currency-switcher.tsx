'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useProfile } from '@/shared/hooks/useProfile';
import { trpc } from '@/shared/lib/trpc/client';

const COUNTRY_CURRENCIES: Record<string, string[]> = {
  MX: ['MXN', 'USD'],
  CO: ['COP', 'USD'],
  AR: ['ARS', 'USD'],
  BR: ['BRL', 'USD'],
  CL: ['CLP', 'USD'],
  US: ['USD'],
};

const FALLBACK_CURRENCIES = ['MXN', 'COP', 'ARS', 'BRL', 'CLP', 'USD'];

export function CurrencySwitcher() {
  const router = useRouter();
  const { currency, country } = useCurrency();
  const { data: profile } = useProfile();
  const [isPending, startTransition] = useTransition();
  const updateCurrency = trpc.me.updatePreferredCurrency.useMutation({
    onSuccess: () => {
      startTransition(() => router.refresh());
    },
  });

  const options = COUNTRY_CURRENCIES[country] ?? FALLBACK_CURRENCIES;

  const handleChange = (next: string) => {
    if (next === currency) return;
    if (!profile) return;
    updateCurrency.mutate({ currency: next });
  };

  return (
    <label className="sr-only" htmlFor="currency-switcher-select">
      Currency
      <select
        id="currency-switcher-select"
        aria-label="Currency"
        className="not-sr-only inline-flex h-8 items-center rounded-md border border-[var(--color-border-subtle)] bg-transparent px-2 text-sm"
        value={currency}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending || updateCurrency.isPending || !profile}
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
