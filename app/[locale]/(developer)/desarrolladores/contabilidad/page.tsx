import { getTranslations } from 'next-intl/server';
import { ContabilidadPinPage } from '@/features/developer/components/contabilidad/ContabilidadPinPage';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.contabilidad' });
  return { title: t('metaTitle') };
}

export default function ContabilidadRoute() {
  return <ContabilidadPinPage />;
}
