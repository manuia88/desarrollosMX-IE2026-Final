// F14.F.10 Sprint 9 BIBLIA — Photographer Dashboard route (RSC).
// Auth + studio_users_extension validados en /studio-app/layout.tsx.
// Esta page valida studio_role=studio_photographer + suscripción activa Foto plan,
// sino redirige a onboarding.

import { redirect } from 'next/navigation';
import { PhotographerDashboard } from '@/features/dmx-studio/components/photographer/PhotographerDashboard';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

interface PhotographerDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PhotographerDashboardPage({
  params,
}: PhotographerDashboardPageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/photographer`);
  }

  const admin = createAdminClient();

  const { data: extension } = await admin
    .from('studio_users_extension')
    .select('studio_role, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!extension || extension.studio_role !== 'studio_photographer') {
    redirect(`/${locale}/studio-app/photographer/onboarding`);
  }

  const { data: subscription } = await admin
    .from('studio_subscriptions')
    .select('plan_key, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription || subscription.plan_key !== 'foto') {
    redirect(`/${locale}/studio-app/photographer/onboarding`);
  }

  return (
    <main
      aria-label="Dashboard fotógrafo"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <PhotographerDashboard locale={locale} />
    </main>
  );
}
