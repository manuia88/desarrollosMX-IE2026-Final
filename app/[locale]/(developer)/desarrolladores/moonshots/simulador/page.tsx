import { getTranslations } from 'next-intl/server';
import { SimulatorPage } from '@/features/developer-moonshots/components/SimulatorPage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.moonshots.simulator' });
  return { title: t('title') };
}

export default function SimulatorRoute() {
  return <SimulatorPage />;
}
