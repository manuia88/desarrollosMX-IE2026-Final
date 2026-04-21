'use client';

// features/newsletter/components/ZoneSubscribeCard.tsx
//
// BLOQUE 11.J.3 — Card stateless para suscribirse al newsletter mensual de una
// zona específica. POSTea a /api/newsletter/subscribe con sourceScopeId.
// El componente es invocable desde /indices/[code] (detalle de zona) como
// upgrade futuro — no se merge en IndexDetailClient aquí.

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';

export interface ZoneSubscribeCardProps {
  readonly zoneLabel: string;
  readonly sourceScopeId: string;
  readonly locale: string;
  readonly className?: string;
  readonly endpoint?: string;
}

type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'success' }
  | { readonly kind: 'error'; readonly message: string };

export function ZoneSubscribeCard({
  zoneLabel,
  sourceScopeId,
  locale,
  className,
  endpoint = '/api/newsletter/subscribe',
}: ZoneSubscribeCardProps) {
  const t = useTranslations('Newsletter.zone');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setState({ kind: 'error', message: t('consent_required') });
      return;
    }
    setState({ kind: 'submitting' });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          sourceScopeId,
          consentLfpdppp: consent,
          preferences: {
            frequency: 'monthly',
            zone_scope_ids: [sourceScopeId],
            sections: {
              pulse: true,
              migration: true,
              causal: true,
              alpha: false,
              scorecard: true,
              streaks: true,
            },
          },
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'error');
        setState({ kind: 'error', message: msg || t('error_generic') });
        return;
      }
      setState({ kind: 'success' });
    } catch (_err) {
      setState({ kind: 'error', message: t('error_generic') });
    }
  }

  const isSubmitting = state.kind === 'submitting';
  const isSuccess = state.kind === 'success';

  return (
    <aside
      aria-label={t('aria_card')}
      className={className ?? 'rounded-lg border border-[color:var(--color-border-subtle)] p-4'}
    >
      <h3 className="mb-1 text-base font-semibold text-[color:var(--color-text-primary)]">
        {t('card_title', { zoneLabel })}
      </h3>
      <p className="mb-3 text-sm text-[color:var(--color-text-secondary)]">{t('card_body')}</p>

      {isSuccess ? (
        <p role="status" className="text-sm text-[color:var(--color-success)]">
          {t('success_message')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block text-sm">
            <span className="sr-only">{t('email_label')}</span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder={t('email_placeholder')}
              className="w-full rounded-md border border-[color:var(--color-border-subtle)] px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-[color:var(--color-text-secondary)]">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(ev) => setConsent(ev.target.checked)}
              disabled={isSubmitting}
            />
            <span>{t('consent_label')}</span>
          </label>
          {state.kind === 'error' ? (
            <p role="alert" className="text-xs text-[color:var(--color-danger)]">
              {state.message}
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
      )}
    </aside>
  );
}

export default ZoneSubscribeCard;
