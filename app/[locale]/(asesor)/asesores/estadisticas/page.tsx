import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EstadisticasPage } from '@/features/estadisticas/components/EstadisticasPage';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'estadisticas.page' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

function defaultRange(): { rangeFrom: string; rangeTo: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { rangeFrom: iso(from), rangeTo: iso(today) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AsesorEstadisticasRoute({ params, searchParams }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/estadisticas`);
  }

  const sp = await searchParams;
  const fallback = defaultRange();
  const rangeFrom = sp.from && DATE_RE.test(sp.from) ? sp.from : fallback.rangeFrom;
  const rangeTo = sp.to && DATE_RE.test(sp.to) ? sp.to : fallback.rangeTo;

  return <EstadisticasPage rangeFrom={rangeFrom} rangeTo={rangeTo} />;
}
