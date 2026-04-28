// F14.F.9 Sprint 8 BIBLIA Upgrade 3 — Title card generator.
// Genera title card SVG dinamica per episodio con counter "Capitulo X de Y".

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface GenerateTitleCardResult {
  readonly episodeId: string;
  readonly storagePath: string;
  readonly title: string;
  readonly counterLabel: string;
  readonly svgUploaded: boolean;
}

const TITLE_CARD_BUCKET = 'studio-series-title-cards';

export async function generateTitleCard(
  userId: string,
  episodeId: string,
): Promise<GenerateTitleCardResult> {
  const supabase = createAdminClient();

  const { data: episode } = await supabase
    .from('studio_series_episodes')
    .select('id, episode_number, title, series_id')
    .eq('id', episodeId)
    .maybeSingle();
  if (!episode) throw new TRPCError({ code: 'NOT_FOUND', message: 'Episode not found' });

  const { data: serie } = await supabase
    .from('studio_series_projects')
    .select('id, title, episodes_count, user_id')
    .eq('id', episode.series_id)
    .maybeSingle();
  if (!serie || serie.user_id !== userId) throw new TRPCError({ code: 'FORBIDDEN' });

  const { data: brandKit } = await supabase
    .from('studio_brand_kits')
    .select('primary_color, secondary_color')
    .eq('user_id', userId)
    .maybeSingle();

  const counterLabel = `Capitulo ${episode.episode_number} de ${serie.episodes_count}`;
  const svg = renderTitleCardSvg({
    seriesTitle: serie.title,
    episodeTitle: episode.title,
    counterLabel,
    primaryColor: (brandKit?.primary_color as string | null) ?? '#6366F1',
    secondaryColor: (brandKit?.secondary_color as string | null) ?? '#EC4899',
  });

  const storagePath = `series/${episode.series_id}/${episode.id}/title-card.svg`;
  let svgUploaded = false;
  try {
    const { error: uploadErr } = await supabase.storage
      .from(TITLE_CARD_BUCKET)
      .upload(storagePath, new Blob([svg], { type: 'image/svg+xml' }), {
        upsert: true,
        contentType: 'image/svg+xml',
      });
    if (!uploadErr) svgUploaded = true;
  } catch {
    svgUploaded = false;
  }

  await supabase
    .from('studio_series_episodes')
    .update({ title_card_storage_path: storagePath })
    .eq('id', episodeId);

  return {
    episodeId,
    storagePath,
    title: episode.title,
    counterLabel,
    svgUploaded,
  };
}

interface RenderTitleCardOpts {
  readonly seriesTitle: string;
  readonly episodeTitle: string;
  readonly counterLabel: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
}

export function renderTitleCardSvg(opts: RenderTitleCardOpts): string {
  const safeSeries = escapeXml(opts.seriesTitle);
  const safeEpisode = escapeXml(opts.episodeTitle);
  const safeCounter = escapeXml(opts.counterLabel);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${opts.primaryColor}"/>
      <stop offset="100%" stop-color="${opts.secondaryColor}"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="#0A0A0F"/>
  <rect x="120" y="540" width="240" height="6" fill="url(#brandGrad)"/>
  <text x="120" y="500" fill="#FFFFFF" font-family="Outfit, sans-serif" font-weight="800" font-size="84">${safeSeries}</text>
  <text x="120" y="640" fill="#FFFFFF" font-family="Outfit, sans-serif" font-weight="600" font-size="56">${safeEpisode}</text>
  <text x="120" y="720" fill="#A1A1AA" font-family="DM Sans, sans-serif" font-weight="500" font-size="28" letter-spacing="4">${safeCounter}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
