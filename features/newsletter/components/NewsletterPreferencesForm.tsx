'use client';

// features/newsletter/components/NewsletterPreferencesForm.tsx
//
// BLOQUE 11.J.3 — Form controlado para /newsletter/preferences?token=XXX.
// Renderiza multiselect de zonas (top 20 CDMX hardcoded + search input —
// L-NN-PREFS-ZONEPICKER upgrade futuro), checkboxes de secciones, radio de
// frecuencia, submit a /api/newsletter/preferences/[token].

import { useTranslations } from 'next-intl';
import { type FormEvent, useMemo, useState } from 'react';
import type { NewsletterFrequency, NewsletterPreferences } from '@/features/newsletter/types';

const TOP_20_CDMX: ReadonlyArray<{ readonly scopeId: string; readonly label: string }> = [
  { scopeId: 'roma-norte', label: 'Roma Norte' },
  { scopeId: 'condesa', label: 'Condesa' },
  { scopeId: 'polanco', label: 'Polanco' },
  { scopeId: 'narvarte', label: 'Narvarte' },
  { scopeId: 'del-valle', label: 'Del Valle' },
  { scopeId: 'juarez', label: 'Juárez' },
  { scopeId: 'escandon', label: 'Escandón' },
  { scopeId: 'san-rafael', label: 'San Rafael' },
  { scopeId: 'santa-maria-la-ribera', label: 'Santa María la Ribera' },
  { scopeId: 'coyoacan-centro', label: 'Coyoacán Centro' },
  { scopeId: 'san-angel', label: 'San Ángel' },
  { scopeId: 'mixcoac', label: 'Mixcoac' },
  { scopeId: 'doctores', label: 'Doctores' },
  { scopeId: 'centro', label: 'Centro' },
  { scopeId: 'anahuac', label: 'Anáhuac' },
  { scopeId: 'portales', label: 'Portales' },
  { scopeId: 'tlacoquemecatl', label: 'Tlacoquemécatl' },
  { scopeId: 'lomas-de-chapultepec', label: 'Lomas de Chapultepec' },
  { scopeId: 'xoco', label: 'Xoco' },
  { scopeId: 'obrera', label: 'Obrera' },
];

export interface NewsletterPreferencesFormProps {
  readonly token: string;
  readonly initialPreferences: NewsletterPreferences;
  readonly endpoint?: string;
  readonly onSaved?: () => void;
}

const FREQUENCIES: ReadonlyArray<NewsletterFrequency> = ['monthly', 'quarterly', 'annual'];

type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'success' }
  | { readonly kind: 'error'; readonly message: string };

export function NewsletterPreferencesForm({
  token,
  initialPreferences,
  endpoint,
  onSaved,
}: NewsletterPreferencesFormProps) {
  const t = useTranslations('Newsletter.preferences');
  const [frequency, setFrequency] = useState<NewsletterFrequency>(initialPreferences.frequency);
  const [zones, setZones] = useState<ReadonlyArray<string>>(initialPreferences.zone_scope_ids);
  const [sections, setSections] = useState(initialPreferences.sections);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const filteredZones = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (s.length === 0) return TOP_20_CDMX;
    return TOP_20_CDMX.filter((z) => z.label.toLowerCase().includes(s));
  }, [search]);

  function toggleZone(scopeId: string) {
    setZones((prev) =>
      prev.includes(scopeId) ? prev.filter((id) => id !== scopeId) : [...prev, scopeId],
    );
  }

  function toggleSection(key: keyof NewsletterPreferences['sections']) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const finalEndpoint = endpoint ?? `/api/newsletter/preferences/${encodeURIComponent(token)}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: 'submitting' });
    try {
      const res = await fetch(finalEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          preferences: {
            frequency,
            zone_scope_ids: zones,
            sections,
          },
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'error');
        setState({ kind: 'error', message: msg || t('error_generic') });
        return;
      }
      setState({ kind: 'success' });
      onSaved?.();
    } catch (_err) {
      setState({ kind: 'error', message: t('error_generic') });
    }
  }

  const isSubmitting = state.kind === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('frequency_label')}</legend>
        {FREQUENCIES.map((f) => (
          <label key={f} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="frequency"
              value={f}
              checked={frequency === f}
              onChange={() => setFrequency(f)}
              disabled={isSubmitting}
            />
            {t(`frequency_${f}`)}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('zones_label')}</legend>
        <input
          type="search"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          placeholder={t('zones_search_placeholder')}
          className="w-full rounded-md border border-[color:var(--color-border-subtle)] px-3 py-2 text-sm"
          aria-label={t('zones_search_aria')}
          disabled={isSubmitting}
        />
        <ul className="grid grid-cols-2 gap-1">
          {filteredZones.map((z) => (
            <li key={z.scopeId}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={zones.includes(z.scopeId)}
                  onChange={() => toggleZone(z.scopeId)}
                  disabled={isSubmitting}
                />
                {z.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('sections_label')}</legend>
        {(['pulse', 'migration', 'causal', 'alpha', 'scorecard', 'streaks'] as const).map((key) => (
          <label key={key} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sections[key]}
              onChange={() => toggleSection(key)}
              disabled={isSubmitting}
            />
            {t(`section_${key}`)}
          </label>
        ))}
      </fieldset>

      {state.kind === 'error' ? (
        <p role="alert" className="text-sm text-[color:var(--color-danger)]">
          {state.message}
        </p>
      ) : null}
      {state.kind === 'success' ? (
        <p role="status" className="text-sm text-[color:var(--color-success)]">
          {t('success_message')}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? t('submitting') : t('submit_label')}
      </button>
    </form>
  );
}

export default NewsletterPreferencesForm;
