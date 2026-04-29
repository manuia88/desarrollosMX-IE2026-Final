import { getTranslations } from 'next-intl/server';
import { CommitteePage } from '@/features/developer-moonshots/components/CommitteePage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.moonshots.committee' });
  return { title: t('title') };
}

export default function CommitteeRoute() {
  return <CommitteePage />;
}
