// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — DMX Studio Usage page (RSC entry).
// ADR-054 lock canon DMX Studio dentro DMX único entorno.
// Layout en /studio-app/layout.tsx ya garantiza auth + studio_users_extension creada.
// Esta page enforcea onboarding completo y renderiza el client component UsagePage.

import { getTranslations } from 'next-intl/server';
import { UsagePage } from '@/features/dmx-studio/components/usage';
import { requireStudioOnboardingComplete } from '@/features/dmx-studio/lib/onboarding-gate';

interface StudioUsagePageRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function StudioUsagePageRoute({ params }: StudioUsagePageRouteProps) {
  const { locale } = await params;
  await requireStudioOnboardingComplete(locale);

  const t = await getTranslations('Studio.usage');

  return (
    <main
      aria-label={t('pageTitle')}
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <UsagePage />
    </main>
  );
}
