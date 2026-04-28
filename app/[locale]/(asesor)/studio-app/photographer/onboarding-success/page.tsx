// F14.F.10 Sprint 9 BIBLIA — Photographer Stripe success landing.
// Stripe redirige aquí post-checkout. Webhook subscription.created activará
// plan_key=foto en background; mientras tanto mostramos confirmación + CTA dashboard.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { createClient } from '@/shared/lib/supabase/server';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

interface OnboardingSuccessPageProps {
  params: Promise<{ locale: string }>;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

export default async function PhotographerOnboardingSuccessPage({
  params,
}: OnboardingSuccessPageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <main
      aria-label="Suscripción confirmada"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <Card variant="spotlight" className="flex flex-col gap-5 p-8">
        <DisclosurePill tone="indigo">Pago recibido</DisclosurePill>
        <h1 style={headingStyle}>Bienvenido a DMX Studio Foto</h1>
        <p style={subtitleStyle}>
          Tu suscripción está activa. Estamos terminando de configurar tu cuenta — esto toma
          segundos. Puedes ir al dashboard ahora; los features se activarán automáticamente.
        </p>

        <ul
          className="flex flex-col gap-2 pt-2"
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          <li style={{ fontSize: '13.5px', color: 'var(--canon-cream)', lineHeight: 1.5 }}>
            <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)', marginRight: 8 }}>
              ●
            </span>
            50 videos al mes ya están disponibles
          </li>
          <li style={{ fontSize: '13.5px', color: 'var(--canon-cream)', lineHeight: 1.5 }}>
            <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)', marginRight: 8 }}>
              ●
            </span>
            Branding DMX deshabilitado en todas tus entregas
          </li>
          <li style={{ fontSize: '13.5px', color: 'var(--canon-cream)', lineHeight: 1.5 }}>
            <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)', marginRight: 8 }}>
              ●
            </span>
            Tu portfolio público ya tiene URL asignada
          </li>
        </ul>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            asChild
            variant="primary"
            size="lg"
            data-testid="photographer-onboarding-success-dashboard-cta"
          >
            <Link href={`/${locale}/studio-app/photographer`} aria-label="Ir al dashboard">
              Ir al dashboard
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href={`/${locale}/studio-app/projects/new`} aria-label="Crear primer video">
              Crear primer video
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
