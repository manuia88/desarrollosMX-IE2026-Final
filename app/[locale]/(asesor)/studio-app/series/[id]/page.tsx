// F14.F.9 Sprint 8 BIBLIA — Series detail route (RSC entry).

import { redirect } from 'next/navigation';
import { SeriesDetailPage } from '@/features/dmx-studio/components/series';
import { createClient } from '@/shared/lib/supabase/server';

interface StudioSeriesDetailRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function StudioSeriesDetailRoute({ params }: StudioSeriesDetailRouteProps) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app/series/${id}`);
  }

  return (
    <main
      aria-label="Detalle serie"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <SeriesDetailPage seriesId={id} locale={locale} />
    </main>
  );
}
