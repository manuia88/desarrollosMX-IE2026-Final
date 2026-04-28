// FASE 14.F.2 Sprint 1 — DMX Studio Onboarding 3 pasos (RSC entry).
// ADR-054 lock canon DMX Studio dentro DMX único entorno.
// Layout en /studio-app/layout.tsx ya garantiza auth + studio_users_extension creada
// + ejecuta auto-import del profile DMX → brand_kit. Esta page redirige a /studio-app
// si onboarding ya está completo, hidrata initialValues desde brand_kit y respeta
// skip_step1 query param emitido por el layout.

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { OnboardingFlow } from '@/features/dmx-studio/components/onboarding/OnboardingFlow';
import { createClient } from '@/shared/lib/supabase/server';

interface StudioOnboardingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ skip_step1?: string }>;
}

export default async function StudioOnboardingPage({
  params,
  searchParams,
}: StudioOnboardingPageProps) {
  const { locale } = await params;
  const { skip_step1: skipStep1Param } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/onboarding`);
  }

  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('onboarding_completed, onboarding_step')
    .eq('user_id', user.id)
    .maybeSingle();

  if (extension?.onboarding_completed) {
    redirect(`/${locale}/studio-app`);
  }

  const { data: brandKit } = await supabase
    .from('studio_brand_kits')
    .select('display_name, contact_phone, cities, zones')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  const initialValues = brandKit
    ? {
        name: brandKit.display_name ?? '',
        phone: brandKit.contact_phone ?? '',
        city: brandKit.cities[0] ?? '',
        zonesText: brandKit.zones.join(', '),
      }
    : undefined;

  const skipStep1 = skipStep1Param === 'true';

  const t = await getTranslations('Studio.onboarding');
  const initialStep =
    (extension?.onboarding_step as 'step1' | 'step2' | 'step3' | undefined) ?? 'step1';

  return (
    <main
      aria-label={t('title')}
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col gap-8 px-6 py-16"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <OnboardingFlow
        initialStep={initialStep}
        locale={locale}
        {...(initialValues ? { initialValues } : {})}
        skipStep1={skipStep1}
      />
    </main>
  );
}
