import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AsesorContractsPanel } from '@/features/operaciones/components';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.contracts' });
  return { title: t('asesor.title') };
}

export default async function AsesorContratosRoute({ params }: RouteProps) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/operaciones/${id}/contratos`);
  }
  return (
    <div className="space-y-4 p-6">
      <AsesorContractsPanel operacionId={id} />
    </div>
  );
}
