import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { defaultLocale, isLocale, locales } from '@/shared/lib/i18n/config';

function pickLocale(acceptLanguage: string | null, vercelCountry: string | null): string {
  if (vercelCountry) {
    const byCountry: Record<string, string> = {
      MX: 'es-MX',
      CO: 'es-CO',
      AR: 'es-AR',
      BR: 'pt-BR',
      US: 'en-US',
    };
    const mapped = byCountry[vercelCountry.toUpperCase()];
    if (mapped && isLocale(mapped)) return mapped;
  }

  if (acceptLanguage) {
    const parts = acceptLanguage
      .split(',')
      .map((entry) => entry.trim().split(';')[0])
      .filter(Boolean) as string[];

    for (const part of parts) {
      const exact = locales.find((locale) => locale.toLowerCase() === part.toLowerCase());
      if (exact) return exact;
    }

    for (const part of parts) {
      const lang = part.split('-')[0]?.toLowerCase();
      if (!lang) continue;
      const match = locales.find((locale) => locale.split('-')[0]?.toLowerCase() === lang);
      if (match) return match;
    }
  }

  return defaultLocale;
}

export default async function RootPage() {
  const hdrs = await headers();
  const locale = pickLocale(hdrs.get('accept-language'), hdrs.get('x-vercel-ip-country'));
  redirect(`/${locale}`);
}
