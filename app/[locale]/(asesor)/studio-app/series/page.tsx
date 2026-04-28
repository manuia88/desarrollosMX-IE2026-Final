// F14.F.9 Sprint 8 BIBLIA — Series list route (RSC entry).
// ADR-054 Studio dentro DMX. Auth + onboarding gate canon.

import { redirect } from 'next/navigation';
import { SeriesListPage } from '@/features/dmx-studio/components/series';
import { createClient } from '@/shared/lib/supabase/server';

interface StudioSeriesListRouteProps {
  params: Promise<{ locale: string }>;
}

export default async function StudioSeriesListRoute({ params }: StudioSeriesListRouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/series`);
  }

  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!extension?.onboarding_completed) {
    redirect(`/${locale}/studio-app/onboarding`);
  }

  return (
    <main
      aria-label="Series Studio"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <SeriesListPage locale={locale} />
    </main>
  );
}
