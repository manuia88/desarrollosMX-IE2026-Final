import { getTranslations } from 'next-intl/server';
import { SiteSelectionPage } from '@/features/developer/components/site-selection/SiteSelectionPage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.siteSelection' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function DeveloperSiteSelectionRoute() {
  return <SiteSelectionPage />;
}
