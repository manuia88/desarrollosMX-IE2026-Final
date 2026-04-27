// FASE 14.F.2 Sprint 1 — DMX Studio create project page (RSC entry).
// Auth + onboarding gate already enforced by /studio/layout.tsx.
// Hidrata el flow client (CreateProjectFlow) con locale.

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CreateProjectFlow } from '@/features/dmx-studio/components/projects/CreateProjectFlow';
import { createClient } from '@/shared/lib/supabase/server';

interface StudioNewProjectPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StudioNewProjectPage({ params }: StudioNewProjectPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/projects/new`);
  }

  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!extension?.onboarding_completed) {
    redirect(`/${locale}/studio-app/onboarding`);
  }

  const t = await getTranslations('Studio.projects.new');

  return (
    <main
      aria-label={t('title')}
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col gap-8 px-6 py-16"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <CreateProjectFlow locale={locale} />
    </main>
  );
}
