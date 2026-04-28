'use client';

// F14.F.10 Sprint 9 BIBLIA — Photographer Onboarding Flow (4 steps).
// 1. Business info (businessName + email + phone + bio + zones + years_experience)
// 2. Slug + portfolio visibility toggle
// 3. Stripe checkout Foto plan ($67/mo)
// 4. Confirm + redirect dashboard
// ADR-050 canon: pill buttons, brand gradient, motion ≤ 850ms,
// prefers-reduced-motion respect (vía tokens.css).

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface PhotographerOnboardingFlowProps {
  readonly locale: string;
}

type StepKey = 'business' | 'slug' | 'checkout' | 'confirm';

const STEP_ORDER: ReadonlyArray<StepKey> = ['business', 'slug', 'checkout', 'confirm'];

const STEP_LABELS: Readonly<Record<StepKey, string>> = {
  business: 'Tu estudio',
  slug: 'URL pública',
  checkout: 'Plan Foto',
  confirm: 'Listo',
};

const inputStyle: CSSProperties = {
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

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '90px',
  padding: '12px 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
};

const labelStyle: CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '28px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

const errorStyle: CSSProperties = {
  margin: 0,
  padding: '10px 14px',
  background: 'rgba(244,63,94,0.10)',
  border: '1px solid rgba(244,63,94,0.30)',
  borderRadius: 'var(--canon-radius-pill)',
  fontSize: '13px',
  color: '#FCA5A5',
};

interface BusinessFormState {
  businessName: string;
  email: string;
  phone: string;
  bio: string;
  zonesText: string;
  yearsExperience: string;
}

const INITIAL_BUSINESS: BusinessFormState = {
  businessName: '',
  email: '',
  phone: '',
  bio: '',
  zonesText: '',
  yearsExperience: '',
};

export function PhotographerOnboardingFlow({ locale }: PhotographerOnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>('business');
  const [business, setBusiness] = useState<BusinessFormState>(INITIAL_BUSINESS);
  const [slug, setSlug] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 style={headingStyle}>Crea tu estudio fotográfico</h1>
        <p style={subStyle}>
          Plan Foto $67/mes — 50 videos incluidos, sin branding DMX, white-label opcional.
        </p>
      </header>

      <Stepper currentStep={step} />

      {serverError ? (
        <p role="alert" style={errorStyle}>
          {serverError}
        </p>
      ) : null}

      {step === 'business' ? (
        <BusinessStep
          business={business}
          setBusiness={setBusiness}
          onError={setServerError}
          onDone={() => {
            setServerError(null);
            setStep('slug');
          }}
        />
      ) : null}

      {step === 'slug' ? (
        <SlugStep
          businessName={business.businessName}
          slug={slug}
          setSlug={setSlug}
          onError={setServerError}
          onDone={() => {
            setServerError(null);
            setStep('checkout');
          }}
        />
      ) : null}

      {step === 'checkout' ? (
        <CheckoutStep onError={setServerError} onDone={() => setStep('confirm')} />
      ) : null}

      {step === 'confirm' ? (
        <ConfirmStep onDone={() => router.push(`/${locale}/studio-app/photographer`)} />
      ) : null}
    </div>
  );
}

interface StepperProps {
  readonly currentStep: StepKey;
}

function Stepper({ currentStep }: StepperProps) {
  const idx = STEP_ORDER.indexOf(currentStep);
  return (
    <ol
      aria-label="Pasos de onboarding"
      className="flex flex-wrap items-center gap-3"
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {STEP_ORDER.map((s, i) => {
        const isCurrent = s === currentStep;
        const isComplete = i < idx;
        return (
          <li
            key={s}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[12.5px] font-semibold tabular-nums"
              style={{
                borderRadius: 'var(--canon-radius-pill)',
                background:
                  isComplete || isCurrent ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
                color: isComplete || isCurrent ? '#FFFFFF' : 'var(--canon-cream-2)',
                border: '1px solid var(--canon-border)',
              }}
            >
              {i + 1}
            </span>
            <span
              className="text-[13px] font-medium"
              style={{ color: isCurrent ? 'var(--canon-cream)' : 'var(--canon-cream-2)' }}
            >
              {STEP_LABELS[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface BusinessStepProps {
  readonly business: BusinessFormState;
  readonly setBusiness: (next: BusinessFormState) => void;
  readonly onError: (msg: string | null) => void;
  readonly onDone: () => void;
}

function BusinessStep({ business, setBusiness, onError, onDone }: BusinessStepProps) {
  const formId = useId();
  const upsert = trpc.studio.sprint9Photographer.upsertProfile.useMutation({
    onSuccess() {
      onError(null);
      onDone();
    },
    onError(err) {
      onError(err.message);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const zones = business.zonesText
        .split(',')
        .map((z) => z.trim())
        .filter((z) => z.length > 0);

      const yearsParsed = business.yearsExperience.trim()
        ? Number.parseInt(business.yearsExperience, 10)
        : null;

      if (
        yearsParsed !== null &&
        (Number.isNaN(yearsParsed) || yearsParsed < 0 || yearsParsed > 60)
      ) {
        onError('Años de experiencia debe ser entre 0 y 60');
        return;
      }

      upsert.mutate({
        businessName: business.businessName.trim(),
        email: business.email.trim(),
        phone: business.phone.trim() || undefined,
        bio: business.bio.trim() || undefined,
        specialityZones: zones,
        ...(yearsParsed !== null ? { yearsExperience: yearsParsed } : {}),
      });
    },
    [business, upsert, onError],
  );

  return (
    <FadeUp delay={0}>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-1">
          <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
            Datos del estudio
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
            Información que aparecerá en tu portfolio público.
          </p>
        </header>

        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          aria-label="Datos del estudio fotográfico"
          style={{ display: 'grid', gap: '16px' }}
        >
          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-business-name`} style={labelStyle}>
              Nombre del estudio *
            </label>
            <input
              id={`${formId}-business-name`}
              type="text"
              autoComplete="organization"
              required
              minLength={2}
              maxLength={100}
              style={inputStyle}
              value={business.businessName}
              onChange={(e) => setBusiness({ ...business, businessName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-email`} style={labelStyle}>
              Email *
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              required
              style={inputStyle}
              value={business.email}
              onChange={(e) => setBusiness({ ...business, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-phone`} style={labelStyle}>
              Teléfono
            </label>
            <input
              id={`${formId}-phone`}
              type="tel"
              autoComplete="tel"
              maxLength={20}
              style={inputStyle}
              value={business.phone}
              onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-bio`} style={labelStyle}>
              Bio breve
            </label>
            <textarea
              id={`${formId}-bio`}
              maxLength={500}
              style={textareaStyle}
              value={business.bio}
              onChange={(e) => setBusiness({ ...business, bio: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-zones`} style={labelStyle}>
              Zonas de especialidad
            </label>
            <input
              id={`${formId}-zones`}
              type="text"
              placeholder="Polanco, Roma Norte, Condesa"
              style={inputStyle}
              value={business.zonesText}
              onChange={(e) => setBusiness({ ...business, zonesText: e.target.value })}
            />
            <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', margin: 0 }}>
              Separa zonas con coma. Aparecerán en tu portfolio.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-years`} style={labelStyle}>
              Años de experiencia
            </label>
            <input
              id={`${formId}-years`}
              type="number"
              min={0}
              max={60}
              style={inputStyle}
              value={business.yearsExperience}
              onChange={(e) => setBusiness({ ...business, yearsExperience: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={upsert.isPending}
            aria-busy={upsert.isPending}
            data-testid="photographer-onboarding-business-continue"
          >
            {upsert.isPending ? 'Guardando…' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </FadeUp>
  );
}

interface SlugStepProps {
  readonly businessName: string;
  readonly slug: string;
  readonly setSlug: (s: string) => void;
  readonly onError: (msg: string | null) => void;
  readonly onDone: () => void;
}

function SlugStep({ businessName, slug, setSlug, onError, onDone }: SlugStepProps) {
  const formId = useId();
  const profileQuery = trpc.studio.sprint9Photographer.getProfile.useQuery();
  const setSlugMutation = trpc.studio.sprint9Photographer.setSlug.useMutation({
    onSuccess() {
      onError(null);
      onDone();
    },
    onError(err) {
      onError(err.message);
    },
  });
  const togglePortfolio = trpc.studio.sprint9Photographer.togglePortfolioVisible.useMutation();
  const [portfolioVisible, setPortfolioVisible] = useState<boolean>(true);
  const currentSlug = profileQuery.data?.slug ?? '';

  const effectiveSlug = slug || currentSlug;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!/^[a-z0-9-]+$/.test(effectiveSlug)) {
        onError('Slug debe ser kebab-case (a-z, 0-9, guiones)');
        return;
      }
      if (effectiveSlug.length < 3 || effectiveSlug.length > 60) {
        onError('Slug debe tener entre 3 y 60 caracteres');
        return;
      }
      togglePortfolio.mutate({ visible: portfolioVisible });
      if (slug && slug !== currentSlug) {
        setSlugMutation.mutate({ slug });
      } else {
        onError(null);
        onDone();
      }
    },
    [
      effectiveSlug,
      slug,
      currentSlug,
      portfolioVisible,
      setSlugMutation,
      togglePortfolio,
      onError,
      onDone,
    ],
  );

  return (
    <FadeUp delay={0}>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-1">
          <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
            URL pública del portfolio
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
            Este será el link que compartirás con clientes para mostrar tu trabajo.
          </p>
        </header>

        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          aria-label="Configuración de URL pública"
          style={{ display: 'grid', gap: '16px' }}
        >
          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-slug`} style={labelStyle}>
              Slug
            </label>
            <input
              id={`${formId}-slug`}
              type="text"
              placeholder={currentSlug || 'mi-estudio'}
              pattern="^[a-z0-9-]+$"
              minLength={3}
              maxLength={60}
              style={inputStyle}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              data-testid="photographer-onboarding-slug-input"
            />
            <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', margin: 0 }}>
              Vista previa: dmx.studio/p/{effectiveSlug || 'tu-slug'}
            </p>
            {currentSlug ? (
              <DisclosurePill tone="indigo">
                Slug actual: {currentSlug}. Déjalo vacío para mantenerlo.
              </DisclosurePill>
            ) : null}
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={portfolioVisible}
              onChange={(e) => setPortfolioVisible(e.target.checked)}
              style={{ marginTop: '3px' }}
            />
            <span>
              Hacer mi portfolio visible públicamente. Puedes cambiarlo en cualquier momento.
            </span>
          </label>

          <p style={{ fontSize: '12.5px', color: 'var(--canon-cream-2)', margin: 0 }}>
            Estudio: <strong>{businessName || 'Tu estudio'}</strong>
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={setSlugMutation.isPending}
            aria-busy={setSlugMutation.isPending}
            data-testid="photographer-onboarding-slug-continue"
          >
            {setSlugMutation.isPending ? 'Guardando…' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </FadeUp>
  );
}

interface CheckoutStepProps {
  readonly onError: (msg: string | null) => void;
  readonly onDone: () => void;
}

function CheckoutStep({ onError, onDone }: CheckoutStepProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  const handleCheckout = useCallback(async () => {
    if (!acknowledged) {
      onError('Acepta los términos de reseller para continuar');
      return;
    }
    setSubmitting(true);
    onError(null);
    try {
      const response = await fetch('/api/stripe/studio/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: 'foto',
          successPath: '/studio-app/photographer/onboarding-success',
          cancelPath: '/studio-app/photographer/onboarding',
        }),
      });
      const json = (await response.json()) as { url?: string; error?: string; message?: string };
      if (!response.ok || !json.url) {
        onError(json.message ?? json.error ?? 'No se pudo iniciar el checkout');
        setSubmitting(false);
        return;
      }
      onDone();
      window.location.href = json.url;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error desconocido');
      setSubmitting(false);
    }
  }, [acknowledged, onError, onDone]);

  return (
    <FadeUp delay={0}>
      <Card variant="spotlight" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-2">
          <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
            DMX Studio Foto — $67 USD/mes
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
            50 videos al mes, sin branding DMX, white-label opcional, copy pack incluido.
          </p>
        </header>

        <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            '50 videos al mes incluidos',
            'Sin marca de agua DMX en tus entregas',
            'White-label opcional con tu marca',
            'Voz narrada con ElevenLabs',
            'Copy pack básico para captions',
            'Procesamiento masivo (hasta 20 videos por batch)',
            'Portfolio público con tu slug',
            'Comisiones por referidos al plan Pro',
          ].map((feature) => (
            <li
              key={feature}
              style={{ fontSize: '13.5px', color: 'var(--canon-cream)', lineHeight: 1.5 }}
            >
              <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)', marginRight: 8 }}>
                ●
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--canon-cream-2)',
            lineHeight: 1.5,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            data-testid="photographer-onboarding-reseller-terms"
            style={{ marginTop: '3px' }}
          />
          <span>
            Acepto los términos de reseller. Puedo aplicar markup a mis clientes y mantener el
            margen como ingreso de mi estudio.
          </span>
        </label>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleCheckout}
          disabled={submitting || !acknowledged}
          aria-busy={submitting}
          data-testid="photographer-onboarding-checkout-cta"
        >
          {submitting ? 'Redirigiendo…' : 'Suscribirme — $67 USD/mes'}
        </Button>
      </Card>
    </FadeUp>
  );
}

interface ConfirmStepProps {
  readonly onDone: () => void;
}

function ConfirmStep({ onDone }: ConfirmStepProps) {
  return (
    <FadeUp delay={0}>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <DisclosurePill tone="indigo">Suscripción activa</DisclosurePill>
        <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
          Listo. Tu estudio está activo.
        </h2>
        <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
          Ya puedes empezar a crear videos para tus clientes y compartir tu portfolio público.
        </p>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onDone}
          data-testid="photographer-onboarding-confirm-cta"
        >
          Ir al dashboard
        </Button>
      </Card>
    </FadeUp>
  );
}
