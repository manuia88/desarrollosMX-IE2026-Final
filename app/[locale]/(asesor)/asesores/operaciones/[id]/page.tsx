import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { OperacionDetail } from '@/features/asesor-operaciones/components';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Operaciones' });
  return {
    title: t('detail.title'),
  };
}

export default async function AsesorOperacionDetailRoute({ params }: RouteProps) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/operaciones/${id}`);
  }
  return <OperacionDetail operacionId={id} locale={locale} />;
}
