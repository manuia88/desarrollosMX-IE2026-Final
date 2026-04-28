// F14.F.10 Sprint 9 BIBLIA — Photographer Onboarding route (RSC entry).
// Auth validada en /studio-app/layout.tsx. Esta page renderiza el flow client.

import { redirect } from 'next/navigation';
import { PhotographerOnboardingFlow } from '@/features/dmx-studio/components/photographer/PhotographerOnboardingFlow';
import { createClient } from '@/shared/lib/supabase/server';

interface PhotographerOnboardingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PhotographerOnboardingPage({
  params,
}: PhotographerOnboardingPageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/photographer/onboarding`);
  }

  return (
    <main
      aria-label="Onboarding fotógrafo"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <PhotographerOnboardingFlow locale={locale} />
    </main>
  );
}
