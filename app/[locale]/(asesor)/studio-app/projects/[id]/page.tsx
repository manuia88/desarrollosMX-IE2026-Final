// FASE 14.F.2 Sprint 1 — DMX Studio Project Result Page (RSC entry).
// Layout en /studio/layout.tsx ya garantiza auth + studio_users_extension.
// Esta page enforcea onboarding completo via requireStudioOnboardingComplete y
// renderiza el ResultPage client component que consume tRPC studio.projects.getById.

import { getTranslations } from 'next-intl/server';
import { ResultPage } from '@/features/dmx-studio/components/projects/ResultPage';
import { requireStudioOnboardingComplete } from '@/features/dmx-studio/lib/onboarding-gate';

interface StudioProjectResultPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function StudioProjectResultPage({ params }: StudioProjectResultPageProps) {
  const { locale, id } = await params;
  await requireStudioOnboardingComplete(locale);

  const t = await getTranslations('Studio.result');

  return (
    <main
      aria-label={t('title')}
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <ResultPage projectId={id} locale={locale} />
    </main>
  );
}
