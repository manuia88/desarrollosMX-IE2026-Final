import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { OperacionesList } from '@/features/operaciones/components';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Operaciones' });
  return {
    title: t('list.title'),
    description: t('list.metaDescription'),
  };
}

export default async function AsesorOperacionesRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/operaciones`);
  }
  return <OperacionesList locale={locale} />;
}
