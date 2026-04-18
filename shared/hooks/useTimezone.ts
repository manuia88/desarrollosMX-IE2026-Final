'use client';

import { COUNTRY_DEFAULT_TIMEZONE, localeToCountry } from '@/shared/lib/i18n/config';
import { useLocale } from './useLocale';
import { useProfile } from './useProfile';

export function useTimezone(): string {
  const locale = useLocale();
  const { data: profile } = useProfile();

  const country = profile?.country_code ?? localeToCountry[locale];
  return profile?.preferred_timezone ?? COUNTRY_DEFAULT_TIMEZONE[country] ?? 'America/Mexico_City';
}
