'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useLocale } from '@/shared/hooks/useLocale';
import { useProfile } from '@/shared/hooks/useProfile';
import { useTimezone } from '@/shared/hooks/useTimezone';
import { type Locale, locales } from '@/shared/lib/i18n/config';
import { trpc } from '@/shared/lib/trpc/client';

function getSupportedTimeZones(): string[] {
  const Intl2 = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  if (typeof Intl2.supportedValuesOf === 'function') {
    return Intl2.supportedValuesOf('timeZone');
  }
  return [
    'America/Mexico_City',
    'America/Bogota',
    'America/Argentina/Buenos_Aires',
    'America/Sao_Paulo',
    'America/New_York',
    'America/Santiago',
    'UTC',
  ];
}

export function AccountForm() {
  const t = useTranslations('Settings.account');
  const locale = useLocale();
  const currentTimezone = useTimezone();
  const { currency } = useCurrency();
  const { data: profile } = useProfile();
  const utils = trpc.useUtils();

  const [timezone, setTimezone] = useState(currentTimezone);
  const [preferredLocale, setPreferredLocale] = useState<Locale>(locale);
  const [preferredCurrency, setPreferredCurrency] = useState(currency);

  useEffect(() => {
    if (profile?.preferred_timezone) setTimezone(profile.preferred_timezone);
  }, [profile?.preferred_timezone]);

  useEffect(() => {
    if (profile?.preferred_locale && locales.includes(profile.preferred_locale as Locale)) {
      setPreferredLocale(profile.preferred_locale as Locale);
    }
  }, [profile?.preferred_locale]);

  useEffect(() => {
    if (profile?.preferred_currency) setPreferredCurrency(profile.preferred_currency);
  }, [profile?.preferred_currency]);

  const timezones = useMemo(() => getSupportedTimeZones(), []);

  const updateTimezone = trpc.me.updatePreferredTimezone.useMutation({
    onSuccess: async () => {
      await utils.me.profile.invalidate();
      toast.success(t('title'));
    },
  });

  const updateLocale = trpc.me.updatePreferredLocale.useMutation({
    onSuccess: async () => {
      await utils.me.profile.invalidate();
    },
  });

  const updateCurrency = trpc.me.updatePreferredCurrency.useMutation({
    onSuccess: async () => {
      await utils.me.profile.invalidate();
    },
  });

  const handleSave = () => {
    updateTimezone.mutate({ timezone });
    if (preferredLocale !== locale) updateLocale.mutate({ locale: preferredLocale });
    if (preferredCurrency !== currency) updateCurrency.mutate({ currency: preferredCurrency });
  };

  const isSaving = updateTimezone.isPending || updateLocale.isPending || updateCurrency.isPending;

  return (
    <section className="space-y-6 rounded-md border p-6">
      <header>
        <h2 className="text-lg font-medium">{t('title')}</h2>
      </header>

      <div className="space-y-2">
        <label htmlFor="locale-select" className="block text-sm font-medium">
          {t('language')}
        </label>
        <select
          id="locale-select"
          value={preferredLocale}
          onChange={(event) => setPreferredLocale(event.target.value as Locale)}
          className="w-full rounded-md border px-3 py-2"
        >
          {locales.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="currency-input" className="block text-sm font-medium">
          {t('currency')}
        </label>
        <input
          id="currency-input"
          value={preferredCurrency}
          onChange={(event) => setPreferredCurrency(event.target.value.toUpperCase())}
          maxLength={3}
          className="w-full rounded-md border px-3 py-2 uppercase"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="timezone-select" className="block text-sm font-medium">
          {t('timezone')}
        </label>
        <select
          id="timezone-select"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          {timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--color-text-muted)]">{t('timezoneHelp')}</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="rounded-md bg-[var(--color-surface-inverse,#111)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSaving ? '…' : t('title')}
      </button>
    </section>
  );
}
