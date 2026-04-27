// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — DMX Studio Library page (RSC entry).
// ADR-054 lock canon DMX Studio dentro DMX único entorno.
// Auth + studio_users_extension validados en /studio-app/layout.tsx (onboarding gate).

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LibraryPage } from '@/features/dmx-studio/components/library';
import { createClient } from '@/shared/lib/supabase/server';

interface StudioLibraryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StudioLibraryPageRoute({ params }: StudioLibraryPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/library`);
  }

  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!extension?.onboarding_completed) {
    redirect(`/${locale}/studio-app/onboarding`);
  }

  const t = await getTranslations('Studio.library');

  return (
    <main
      aria-label={t('pageTitle')}
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <LibraryPage locale={locale} />
    </main>
  );
}
