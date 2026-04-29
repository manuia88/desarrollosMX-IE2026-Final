import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ALLOWED_DEV_ROLES } from '@/features/dev-shell';
import { FeasibilityWizard } from '@/features/developer-upg/components/FeasibilityWizard';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.upg.feasibility' });
  return {
    title: t('newCta'),
    description: t('costNote'),
  };
}

export default async function FeasibilityNewRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/desarrolladores/intelligence/feasibility/new`);
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ALLOWED_DEV_ROLES.has(profile.rol)) {
    redirect(`/${locale}/profile?reason=role_required_dev`);
  }
  return <FeasibilityWizard locale={locale} />;
}
