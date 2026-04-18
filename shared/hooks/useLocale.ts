'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import type { Locale } from '@/shared/lib/i18n/config';
import { defaultLocale, isLocale } from '@/shared/lib/i18n/config';

export function useLocale(): Locale {
  const locale = useNextIntlLocale();
  return isLocale(locale) ? locale : defaultLocale;
}
