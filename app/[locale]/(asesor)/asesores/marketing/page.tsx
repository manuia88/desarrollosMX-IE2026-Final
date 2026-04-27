import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { MarketingTabs } from '@/features/marketing/components';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Marketing' });
  return {
    title: t('list.title'),
    description: t('list.metaDescription'),
  };
}

export default async function AsesorMarketingRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/marketing`);
  }
  return <MarketingTabs locale={locale} />;
}
