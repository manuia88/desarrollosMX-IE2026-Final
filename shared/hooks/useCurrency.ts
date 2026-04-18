'use client';

import { COUNTRY_DEFAULT_CURRENCY, localeToCountry } from '@/shared/lib/i18n/config';
import { useLocale } from './useLocale';
import { useProfile } from './useProfile';

type UseCurrencyResult = {
  currency: string;
  country: string;
  locale: string;
};

export function useCurrency(): UseCurrencyResult {
  const locale = useLocale();
  const { data: profile } = useProfile();

  const country = profile?.country_code ?? localeToCountry[locale];
  const currency = profile?.preferred_currency ?? COUNTRY_DEFAULT_CURRENCY[country] ?? 'MXN';

  return { currency, country, locale };
}
