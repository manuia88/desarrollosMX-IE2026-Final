// F14.F.9 Sprint 8 BIBLIA LATERAL 7 — Public series page route.
// publicProcedure cero auth + SEO Open Graph dynamic.

import type { Metadata } from 'next';
import { PublicSeriesPage } from '@/features/dmx-studio/components/public-series/PublicSeriesPage';

interface PublicSeriesRouteParams {
  params: Promise<{ locale: string; 'asesor-slug': string; 'serie-slug': string }>;
}

export async function generateMetadata({ params }: PublicSeriesRouteParams): Promise<Metadata> {
  const { 'asesor-slug': asesorSlug, 'serie-slug': serieSlug } = await params;
  const title = `${serieSlug} — DMX Studio`;
  const description = `Serie documental producida por ${asesorSlug} en DMX Studio.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'video.tv_show' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PublicSeriesRoute({ params }: PublicSeriesRouteParams) {
  const { locale, 'asesor-slug': asesorSlug, 'serie-slug': serieSlug } = await params;
  return <PublicSeriesPage asesorSlug={asesorSlug} serieSlug={serieSlug} locale={locale} />;
}
