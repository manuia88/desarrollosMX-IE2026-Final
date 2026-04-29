import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DocumentsListPage } from '@/features/document-intel/components/dev/DocumentsListPage';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.documents.list' });
  return { title: t('title') };
}

export default async function AiDocumentsRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('desarrolladora_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.desarrolladora_id) redirect(`/${locale}/desarrolladores/dashboard`);

  const admin = createAdminClient();
  const { data: proyectos } = await admin
    .from('proyectos')
    .select('id, nombre')
    .eq('desarrolladora_id', profile.desarrolladora_id)
    .order('nombre');

  return (
    <DocumentsListPage
      locale={locale}
      projects={(proyectos ?? []).map((p) => ({ id: p.id, nombre: p.nombre ?? '' }))}
    />
  );
}
