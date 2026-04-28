// F14.F.10 Sprint 9 SUB-AGENT 4 — Portfolio público fotógrafo /studio/foto/[slug].
// Server component RSC publicProcedure cero auth gate. SEO Open Graph dynamic.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  type PhotographerPortfolioData,
  PhotographerPortfolioPage,
} from '@/features/dmx-studio/components/photographer-public/PhotographerPortfolioPage';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string; slug: string }>;
}

async function loadPortfolio(slug: string): Promise<PhotographerPortfolioData | null> {
  const supabase = createAdminClient();
  const { data: photographer } = await supabase
    .from('studio_photographers')
    .select(
      'id, user_id, business_name, slug, bio, phone, email, website, speciality_zones, years_experience, rating_avg, clients_count, videos_generated_total, white_label_enabled, white_label_custom_footer, markup_pct, portfolio_visible',
    )
    .eq('slug', slug)
    .eq('portfolio_visible', true)
    .maybeSingle();
  if (!photographer) return null;

  const { data: videos } = await supabase
    .from('studio_video_outputs')
    .select('id, storage_url, thumbnail_url, project_id, created_at, render_status')
    .eq('user_id', photographer.user_id)
    .eq('render_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(12);

  return {
    photographer: {
      id: photographer.id,
      userId: photographer.user_id,
      businessName: photographer.business_name,
      slug: photographer.slug,
      bio: photographer.bio,
      phone: photographer.phone,
      email: photographer.email,
      website: photographer.website,
      specialityZones: (photographer.speciality_zones ?? []) as ReadonlyArray<string>,
      yearsExperience: photographer.years_experience,
      ratingAvg: Number(photographer.rating_avg ?? 0),
      clientsCount: Number(photographer.clients_count ?? 0),
      videosGeneratedTotal: Number(photographer.videos_generated_total ?? 0),
      whiteLabelEnabled: Boolean(photographer.white_label_enabled),
      whiteLabelCustomFooter: photographer.white_label_custom_footer,
      markupPct: Number(photographer.markup_pct ?? 0),
    },
    videos: (videos ?? []).map((v) => ({
      id: v.id,
      storageUrl: v.storage_url,
      thumbnailUrl: v.thumbnail_url,
      projectId: v.project_id,
      createdAt: v.created_at,
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPortfolio(slug);
  if (!data) {
    return { title: 'Fotógrafo no encontrado · DMX Studio' };
  }
  const title = `${data.photographer.businessName} · Fotografía Inmobiliaria · DMX Studio`;
  const description =
    data.photographer.bio ??
    `Portfolio de ${data.photographer.businessName} — videos inmobiliarios profesionales generados con IA`;
  const ogImage = data.videos.find((v) => v.thumbnailUrl)?.thumbnailUrl ?? null;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/studio/foto/${slug}`,
    },
  };
}

export default async function PhotographerPortfolioPublicPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await loadPortfolio(slug);
  if (!data) {
    return (
      <main style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--canon-cream)' }}>
        <h1>Fotógrafo no encontrado</h1>
      </main>
    );
  }
  return <PhotographerPortfolioPage data={data} slug={slug} locale={locale} />;
}
