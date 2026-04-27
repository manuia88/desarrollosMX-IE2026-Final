// FASE 14.F.2 Sprint 1 — DMX Studio Dashboard (RSC entry).
// ADR-054 lock canon DMX Studio dentro DMX único entorno.
// Auth + studio_users_extension validados en /studio/layout.tsx.
// Esta page enforcea onboarding completo via requireStudioOnboardingComplete y
// renderiza el dashboard client component que consume tRPC studio.dashboard.*.

import { getTranslations } from 'next-intl/server';
import { StudioDashboard } from '@/features/dmx-studio/components/dashboard/StudioDashboard';
import { requireStudioOnboardingComplete } from '@/features/dmx-studio/lib/onboarding-gate';

interface StudioDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StudioDashboardPage({ params }: StudioDashboardPageProps) {
  const { locale } = await params;
  await requireStudioOnboardingComplete(locale);

  const t = await getTranslations('Studio.dashboard');

  return (
    <main
      aria-label={t('title')}
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <StudioDashboard locale={locale} />
    </main>
  );
}
