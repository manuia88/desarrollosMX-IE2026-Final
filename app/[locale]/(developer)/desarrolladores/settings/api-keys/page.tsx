import { getTranslations } from 'next-intl/server';
import { ApiKeysPage } from '@/features/developer-moonshots/components/ApiKeysPage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.moonshots.apiEnterprise' });
  return { title: t('title') };
}

export default function ApiKeysSettingsRoute() {
  return <ApiKeysPage />;
}
