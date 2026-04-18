'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale } from '@/shared/hooks/useLocale';
import { useProfile } from '@/shared/hooks/useProfile';
import { type Locale, locales } from '@/shared/lib/i18n/config';
import { trpc } from '@/shared/lib/trpc/client';

const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
  'es-MX': { label: 'Español (MX)', flag: '🇲🇽' },
  'es-CO': { label: 'Español (CO)', flag: '🇨🇴' },
  'es-AR': { label: 'Español (AR)', flag: '🇦🇷' },
  'pt-BR': { label: 'Português (BR)', flag: '🇧🇷' },
  'en-US': { label: 'English (US)', flag: '🇺🇸' },
};

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { data: profile } = useProfile();
  const [isPending, startTransition] = useTransition();
  const updateLocale = trpc.me.updatePreferredLocale.useMutation();

  const handleChange = (next: Locale) => {
    if (next === currentLocale) return;

    // biome-ignore lint/suspicious/noDocumentCookie: next-intl reads NEXT_LOCALE via document.cookie on client; Cookie Store API no disponible en todos los browsers soportados.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    const newPathname = pathname.startsWith(`/${currentLocale}`)
      ? pathname.replace(`/${currentLocale}`, `/${next}`)
      : `/${next}${pathname === '/' ? '' : pathname}`;

    startTransition(() => {
      router.replace(newPathname);
      router.refresh();
    });

    if (profile) updateLocale.mutate({ locale: next });
  };

  return (
    <label className="sr-only" htmlFor="locale-switcher-select">
      {LOCALE_LABELS[currentLocale].label}
      <select
        id="locale-switcher-select"
        aria-label="Locale"
        className="not-sr-only inline-flex h-8 items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-transparent px-2 text-sm"
        value={currentLocale}
        onChange={(event) => handleChange(event.target.value as Locale)}
        disabled={isPending}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code].flag} {code}
          </option>
        ))}
      </select>
    </label>
  );
}
