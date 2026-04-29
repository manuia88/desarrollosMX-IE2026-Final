import { getTranslations } from 'next-intl/server';
import { MoonshotsHub } from '@/features/developer-moonshots/components/MoonshotsHub';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.moonshots' });
  return { title: t('title') };
}

export default function MoonshotsHubRoute() {
  return <MoonshotsHub />;
}
