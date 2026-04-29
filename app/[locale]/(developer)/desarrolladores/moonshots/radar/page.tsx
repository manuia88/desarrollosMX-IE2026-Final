import { getTranslations } from 'next-intl/server';
import { RadarPage } from '@/features/developer-moonshots/components/RadarPage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.moonshots.radar' });
  return { title: t('title') };
}

export default function RadarRoute() {
  return <RadarPage />;
}
