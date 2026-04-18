'use client';

import { useMemo } from 'react';
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatNumber as baseFormatNumber,
  formatPhone as baseFormatPhone,
  formatRelativeTime as baseFormatRelativeTime,
} from '@/shared/lib/i18n/formatters';
import { useCurrency } from './useCurrency';
import { useLocale } from './useLocale';
import { useTimezone } from './useTimezone';

export function useFormatters() {
  const locale = useLocale();
  const timezone = useTimezone();
  const { currency, country } = useCurrency();

  return useMemo(
    () => ({
      locale,
      timezone,
      currency,
      country,
      formatCurrency: (amount: number, overrideCurrency?: string) =>
        baseFormatCurrency(amount, overrideCurrency ?? currency, locale),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        baseFormatNumber(value, locale, options),
      formatDate: (date: Date | string | number, pattern?: string) =>
        baseFormatDate(date, locale, pattern, timezone),
      formatRelativeTime: (date: Date | string | number) => baseFormatRelativeTime(date, locale),
      formatPhone: (phone: string) => baseFormatPhone(phone, country),
    }),
    [locale, timezone, currency, country],
  );
}
