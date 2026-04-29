import { getTranslations } from 'next-intl/server';
import { PipelinePage } from '@/features/developer-moonshots/components/PipelinePage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.moonshots.pipeline' });
  return { title: t('title') };
}

export default function PipelineRoute() {
  return <PipelinePage />;
}
