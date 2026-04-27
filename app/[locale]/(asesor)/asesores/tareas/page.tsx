import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { TareasBoard } from '@/features/tareas/components/TareasBoard';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

const TEAM_VIEW_ROLES = new Set([
  'mb_admin',
  'mb_coordinator',
  'broker_manager',
  'admin_desarrolladora',
  'superadmin',
]);

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Tareas' });
  return {
    title: t('header.title'),
    description: t('header.metaDescription'),
  };
}

export default async function AsesorTareasRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/tareas`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  const canViewTeam = profile?.rol ? TEAM_VIEW_ROLES.has(profile.rol) : false;

  return <TareasBoard canViewTeam={canViewTeam} />;
}
