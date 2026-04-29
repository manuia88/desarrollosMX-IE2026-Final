import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DocumentJobDetail } from '@/features/document-intel/components/dev/DocumentJobDetail';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string; jobId: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.documents.detail' });
  return { title: t('extracted_section') };
}

export default async function AiDocumentDetailRoute({ params }: RouteProps) {
  const { locale, jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  return <DocumentJobDetail jobId={jobId} locale={locale} />;
}
