import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ALLOWED_DEV_ROLES } from '@/features/dev-shell';
import { BenchmarkDashboard } from '@/features/developer-upg/components/BenchmarkDashboard';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.upg.benchmark' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function BenchmarkRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/desarrolladores/intelligence/benchmark`);
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rol, desarrolladora_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ALLOWED_DEV_ROLES.has(profile.rol)) {
    redirect(`/${locale}/profile?reason=role_required_dev`);
  }
  if (!profile.desarrolladora_id) {
    redirect(`/${locale}/profile?reason=desarrolladora_not_assigned`);
  }
  return <BenchmarkDashboard desarrolladoraId={profile.desarrolladora_id} />;
}
