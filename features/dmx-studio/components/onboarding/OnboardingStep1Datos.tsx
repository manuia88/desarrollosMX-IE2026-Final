'use client';

// FASE 14.F.2 Sprint 1 — Onboarding Step 1: datos básicos asesor.
// Form: name + phone + city + zones[]. Zod schema en features/dmx-studio/schemas.

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { type OnboardingStep1Input, onboardingStep1Input } from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface OnboardingStep1InitialValues {
  readonly name?: string;
  readonly phone?: string;
  readonly city?: string;
  readonly zonesText?: string;
}

export interface OnboardingStep1DatosProps {
  readonly onDone: () => void;
  readonly initialValues?: OnboardingStep1InitialValues;
}

interface FormValues {
  readonly name: string;
  readonly phone: string;
  readonly city: string;
  readonly zonesText: string;
}

function hasAnyImportedValue(values: OnboardingStep1InitialValues | undefined): boolean {
  if (!values) return false;
  const { name, phone, city, zonesText } = values;
  return Boolean(
    (typeof name === 'string' && name.trim().length > 0) ||
      (typeof phone === 'string' && phone.trim().length > 0) ||
      (typeof city === 'string' && city.trim().length > 0) ||
      (typeof zonesText === 'string' && zonesText.trim().length > 0),
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

const labelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

export function OnboardingStep1Datos({ onDone, initialValues }: OnboardingStep1DatosProps) {
  const t = useTranslations('Studio.onboarding');
  const formId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const hasImportedValues = hasAnyImportedValue(initialValues);

  const completeStep1 = trpc.studio.onboarding.completeStep1.useMutation({
    onSuccess() {
      setServerError(null);
      onDone();
    },
    onError(err) {
      setServerError(err.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: initialValues?.name ?? '',
      phone: initialValues?.phone ?? '',
      city: initialValues?.city ?? '',
      zonesText: initialValues?.zonesText ?? '',
    },
    mode: 'onSubmit',
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const zones = values.zonesText
      .split(',')
      .map((z) => z.trim())
      .filter((z) => z.length > 0);
    const parsed = onboardingStep1Input.safeParse({
      name: values.name,
      phone: values.phone,
      city: values.city,
      zones,
    } satisfies OnboardingStep1Input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setServerError(first?.message ?? 'invalid');
      return;
    }
    completeStep1.mutate(parsed.data);
  };

  return (
    <FadeUp delay={0}>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-1">
          <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
            {t('step1Title')}
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
            {t('step1Subtitle')}
          </p>
        </header>

        {hasImportedValues && (
          <p
            data-testid="auto-import-banner"
            aria-live="polite"
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-pill)',
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
            }}
          >
            {t('autoImportBanner')}
          </p>
        )}

        <form
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label={t('step1Title')}
          style={{ display: 'grid', gap: '16px' }}
        >
          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-name`} style={labelStyle}>
              {t('nameLabel')}{' '}
              <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
                *
              </span>
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              autoComplete="name"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              style={inputStyle}
              {...register('name', { required: true, minLength: 1, maxLength: 160 })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-phone`} style={labelStyle}>
              {t('phoneLabel')}{' '}
              <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
                *
              </span>
            </label>
            <input
              id={`${formId}-phone`}
              type="tel"
              autoComplete="tel"
              aria-required="true"
              aria-invalid={Boolean(errors.phone)}
              style={inputStyle}
              {...register('phone', { required: true, minLength: 7, maxLength: 40 })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-city`} style={labelStyle}>
              {t('cityLabel')}{' '}
              <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
                *
              </span>
            </label>
            <input
              id={`${formId}-city`}
              type="text"
              autoComplete="address-level2"
              aria-required="true"
              aria-invalid={Boolean(errors.city)}
              style={inputStyle}
              {...register('city', { required: true, minLength: 1, maxLength: 160 })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-zones`} style={labelStyle}>
              {t('zonesLabel')}{' '}
              <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
                *
              </span>
            </label>
            <input
              id={`${formId}-zones`}
              type="text"
              aria-required="true"
              aria-describedby={`${formId}-zones-help`}
              aria-invalid={Boolean(errors.zonesText)}
              style={inputStyle}
              placeholder="Polanco, Roma Norte, Condesa"
              {...register('zonesText', { required: true })}
            />
            <p
              id={`${formId}-zones-help`}
              style={{ fontSize: '12px', color: 'var(--canon-cream-2)', margin: 0 }}
            >
              {t('zonesHelp')}
            </p>
          </div>

          {serverError && (
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
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting || completeStep1.isPending}
            aria-busy={completeStep1.isPending}
          >
            {completeStep1.isPending ? `${t('continueButton')}…` : t('continueButton')}
          </Button>
        </form>
      </Card>
    </FadeUp>
  );
}
