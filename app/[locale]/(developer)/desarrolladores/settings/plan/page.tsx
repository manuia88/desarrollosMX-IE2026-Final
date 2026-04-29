import { getTranslations } from 'next-intl/server';
import { PlanPage } from '@/features/developer/components/settings/PlanPage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.plans' });
  return { title: t('metaTitle') };
}

export default function PlanRoute() {
  return <PlanPage />;
}
