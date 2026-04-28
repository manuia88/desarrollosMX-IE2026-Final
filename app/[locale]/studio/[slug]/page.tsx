// F14.F.8 Sprint 7 BIBLIA Tarea 7.2 + Upgrade 3 — Galería pública /studio/[slug] SEO.
// Server component RSC publicProcedure cero auth gate.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  type PublicGalleryData,
  PublicGalleryPage,
} from '@/features/dmx-studio/components/public-gallery/PublicGalleryPage';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string; slug: string }>;
}

async function loadGallery(slug: string): Promise<PublicGalleryData | null> {
  const supabase = createAdminClient();
  const { data: galleryRow } = await supabase
    .from('studio_public_galleries')
    .select('id, user_id, slug, title, bio, cover_image_url, featured_video_ids, view_count, meta')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (!galleryRow) return null;
  const gallery = {
    ...galleryRow,
    meta: (galleryRow.meta as Record<string, unknown> | null) ?? {},
  };
  const { data: brandKit } = await supabase
    .from('studio_brand_kits')
    .select('display_name, tagline, logo_url, primary_color, secondary_color, accent_color')
    .eq('user_id', gallery.user_id)
    .maybeSingle();
  const { data: avatar } = await supabase
    .from('studio_avatars')
    .select('source_photo_storage_path, status')
    .eq('user_id', gallery.user_id)
    .maybeSingle();
  return { gallery, brandKit, avatar };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadGallery(slug);
  if (!data) {
    return { title: 'Galería no encontrada · DMX Studio' };
  }
  const title = data.brandKit?.display_name
    ? `${data.brandKit.display_name} · DMX Studio`
    : `${data.gallery.title} · DMX Studio`;
  const description =
    data.brandKit?.tagline ?? data.gallery.bio ?? 'Galería pública de videos inmobiliarios';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: data.gallery.cover_image_url ? [data.gallery.cover_image_url] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/studio/${slug}`,
    },
  };
}

export default async function PublicStudioGalleryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await loadGallery(slug);
  if (!data) {
    return (
      <main style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--canon-cream)' }}>
        <h1>Galería no encontrada</h1>
      </main>
    );
  }
  return <PublicGalleryPage data={data} slug={slug} locale={locale} />;
}
