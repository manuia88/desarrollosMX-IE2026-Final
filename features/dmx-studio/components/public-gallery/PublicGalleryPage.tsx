// F14.F.8 Sprint 7 BIBLIA Tarea 7.2 — Public gallery main page (server component).

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { AsesorHero } from './AsesorHero';
import { PublicVideoGrid } from './PublicVideoGrid';
import { ReferralForm } from './ReferralForm';
import { SeoMeta } from './SeoMeta';
import { SocialProofBadge } from './SocialProofBadge';

export interface PublicGalleryData {
  readonly gallery: {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    bio: string | null;
    cover_image_url: string | null;
    featured_video_ids: ReadonlyArray<string>;
    view_count: number;
    meta: Record<string, unknown>;
  };
  readonly brandKit: {
    display_name: string | null;
    tagline: string | null;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
  } | null;
  readonly avatar: {
    source_photo_storage_path: string;
    status: string;
  } | null;
}

interface Props {
  readonly data: PublicGalleryData;
  readonly slug: string;
  readonly locale: string;
}

async function loadVideos(userId: string, featuredIds: ReadonlyArray<string>) {
  const supabase = createAdminClient();
  if (featuredIds.length === 0) {
    const { data } = await supabase
      .from('studio_video_outputs')
      .select('id, hook_variant, format, storage_url, thumbnail_url, duration_seconds, created_at')
      .eq('user_id', userId)
      .eq('render_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(12);
    return data ?? [];
  }
  const { data } = await supabase
    .from('studio_video_outputs')
    .select('id, hook_variant, format, storage_url, thumbnail_url, duration_seconds, created_at')
    .in('id', [...featuredIds]);
  return data ?? [];
}

async function loadStats(slug: string, userId: string) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 1);
  const { count: viewsLast30d } = await supabase
    .from('studio_gallery_views_log')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_slug', slug)
    .gte('created_at', since.toISOString());
  const { count: leadsLast30d } = await supabase
    .from('studio_referral_form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_user_id', userId)
    .gte('submitted_at', since.toISOString());
  return {
    viewsLast30d: viewsLast30d ?? 0,
    leadsLast30d: leadsLast30d ?? 0,
  };
}

export async function PublicGalleryPage({ data, slug }: Props) {
  const [videos, stats] = await Promise.all([
    loadVideos(data.gallery.user_id, data.gallery.featured_video_ids),
    loadStats(slug, data.gallery.user_id),
  ]);

  return (
    <>
      <SeoMeta data={data} slug={slug} videosCount={videos.length} />
      <main
        style={{
          minHeight: '100vh',
          padding: '40px 24px',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        <AsesorHero data={data} />
        <SocialProofBadge
          viewsLast30d={stats.viewsLast30d}
          leadsLast30d={stats.leadsLast30d}
          totalViews={data.gallery.view_count}
        />
        <PublicVideoGrid
          videos={videos.map((v) => ({
            id: v.id,
            hookVariant: v.hook_variant,
            format: v.format,
            storageUrl: v.storage_url,
            thumbnailUrl: v.thumbnail_url,
            durationSeconds: Number(v.duration_seconds ?? 0),
          }))}
          slug={slug}
        />
        <ReferralForm asesorSlug={slug} />
        <p
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
          }}
        >
          Galería pública generada automáticamente · DMX Studio
        </p>
      </main>
    </>
  );
}
