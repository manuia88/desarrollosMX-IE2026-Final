'use client';

// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Waitlist signup form (landing). Pre-fills + shows priority preview when the
// user is already an authenticated DMX asesor.

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { STUDIO_WAITLIST_ROLE } from '@/features/dmx-studio/schemas';
import { useProfile } from '@/shared/hooks/useProfile';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

type WaitlistRole = (typeof STUDIO_WAITLIST_ROLE)[number];

const COUNTRY_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: 'MX', labelKey: 'country.MX' },
  { value: 'CO', labelKey: 'country.CO' },
  { value: 'AR', labelKey: 'country.AR' },
  { value: 'BR', labelKey: 'country.BR' },
  { value: 'US', labelKey: 'country.US' },
];

interface WaitlistSuccessState {
  readonly foundersCohortEligible: boolean;
  readonly foundersCohortPosition: number | null;
  readonly alreadyExisted: boolean;
}

export function WaitlistFormStudio() {
  const t = useTranslations('Studio.waitlistForm');
  const formId = useId();
  const { data: profile } = useProfile();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<WaitlistRole>('asesor');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState<string>('MX');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<WaitlistSuccessState | null>(null);

  // Pre-fill name + role + country from profile when authenticated.
  useEffect(() => {
    if (!profile) return;
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    if (fullName && name === '') setName(fullName);
    if (profile.country_code && countryCode === 'MX') setCountryCode(profile.country_code);
    if (profile.rol === 'asesor' || profile.rol === 'broker_manager') setRole('asesor');
    else if (profile.rol === 'admin_desarrolladora') setRole('admin_desarrolladora');
    else if (profile.rol === 'studio_photographer') setRole('photographer');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.first_name,
    profile?.last_name,
    profile?.country_code,
    profile?.rol,
    profile,
    name,
    countryCode,
  ]);

  const isAsesor =
    profile?.rol === 'asesor' ||
    profile?.rol === 'broker_manager' ||
    profile?.rol === 'admin_desarrolladora';

  const priorityPreview = trpc.studio.waitlist.getPriorityPreview.useQuery(undefined, {
    enabled: Boolean(profile && isAsesor),
    staleTime: 60_000,
  });

  const join = trpc.studio.waitlist.join.useMutation({
    onSuccess(data) {
      setErrorMessage(null);
      setSuccess({
        foundersCohortEligible: data.foundersCohortEligible,
        foundersCohortPosition: data.foundersCohortPosition,
        alreadyExisted: data.alreadyExisted,
      });
    },
    onError(err) {
      setErrorMessage(err.message);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    join.mutate({
      email: email.trim().toLowerCase(),
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
      city: city.trim() || undefined,
      countryCode,
    });
  }

  if (success) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="canon-card"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--canon-card-border-default)',
          borderRadius: 'var(--canon-radius-card)',
          padding: '32px',
          color: 'var(--canon-cream)',
          maxWidth: '560px',
          margin: '0 auto',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px',
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 700,
          }}
        >
          {t('success.title')}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '15px', lineHeight: 1.55 }}>
          {success.alreadyExisted ? t('success.alreadyExisted') : t('success.firstTime')}
        </p>
        {success.foundersCohortEligible && success.foundersCohortPosition !== null && (
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '17px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              backgroundImage: 'var(--gradient-ai)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {t('success.foundersPosition', { position: success.foundersCohortPosition })}
          </p>
        )}
        <p style={{ margin: '0', fontSize: '13px', color: 'var(--canon-cream-2)' }}>
          {t('success.disclosure')}
        </p>
      </div>
    );
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('formLabel')}
      style={{
        display: 'grid',
        gap: '16px',
        maxWidth: '560px',
        margin: '0 auto',
        padding: '32px',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--canon-card-border-default)',
        borderRadius: 'var(--canon-radius-card)',
        color: 'var(--canon-cream)',
      }}
    >
      <Field label={t('fields.email')} htmlFor={`${formId}-email`} required>
        <input
          id={`${formId}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
          autoComplete="email"
          placeholder={t('placeholders.email')}
          style={inputStyle}
        />
      </Field>

      <Field label={t('fields.name')} htmlFor={`${formId}-name`}>
        <input
          id={`${formId}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder={t('placeholders.name')}
          style={inputStyle}
        />
      </Field>

      <Field label={t('fields.phone')} htmlFor={`${formId}-phone`}>
        <input
          id={`${formId}-phone`}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder={t('placeholders.phone')}
          style={inputStyle}
        />
      </Field>

      <Field label={t('fields.role')} htmlFor={`${formId}-role`} required>
        <select
          id={`${formId}-role`}
          value={role}
          onChange={(e) => setRole(e.target.value as WaitlistRole)}
          required
          aria-required="true"
          style={inputStyle}
        >
          {STUDIO_WAITLIST_ROLE.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '2fr 1fr' }}>
        <Field label={t('fields.city')} htmlFor={`${formId}-city`}>
          <input
            id={`${formId}-city`}
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            placeholder={t('placeholders.city')}
            style={inputStyle}
          />
        </Field>
        <Field label={t('fields.country')} htmlFor={`${formId}-country`} required>
          <select
            id={`${formId}-country`}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            required
            aria-required="true"
            style={inputStyle}
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {priorityPreview.data && (
        <div
          aria-live="polite"
          style={{
            padding: '12px 14px',
            background: 'var(--surface-recessed)',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-pill)',
            fontSize: '13px',
            color: 'var(--canon-cream-2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {t('priorityPreview', { score: priorityPreview.data.score })}
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 14px',
            background: 'rgba(244,63,94,0.10)',
            border: '1px solid rgba(244,63,94,0.30)',
            borderRadius: 'var(--canon-radius-pill)',
            fontSize: '13px',
            color: '#FCA5A5',
          }}
        >
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={join.isPending}
        aria-busy={join.isPending}
      >
        {join.isPending ? t('cta.submitting') : t('cta.submit')}
      </Button>

      <p
        style={{
          margin: 0,
          fontSize: '11.5px',
          color: 'var(--canon-cream-2)',
          textAlign: 'center',
        }}
      >
        {t('disclosure')}
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
};

interface FieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}

function Field({ label, htmlFor, required, children }: FieldProps) {
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: '12.5px',
          fontWeight: 600,
          color: 'var(--canon-cream-2)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)', marginLeft: '4px' }}>
            *
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
