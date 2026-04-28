// F14.F.8 Sprint 7 BIBLIA Tarea 7.5 + Upgrade 9 — Video de Zona generator.
// Cross-feature M17 IE integration vía ADR-055 shared module.

import { TRPCError } from '@trpc/server';
import {
  getZoneMarketData,
  getZoneScores,
  type ZoneMarketData,
  type ZoneScoresSnapshot,
} from '@/shared/lib/ie-cross-feature';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface ZoneVideoGenerationInput {
  readonly userId: string;
  readonly zoneId: string;
  readonly projectId?: string;
}

export interface ZoneVideoGenerationResult {
  readonly zoneVideoId: string;
  readonly projectId: string;
  readonly zoneName: string;
  readonly scores: ZoneScoresSnapshot;
  readonly market: ZoneMarketData;
  readonly aiSummary: string;
}

export async function generateZoneVideo(
  input: ZoneVideoGenerationInput,
): Promise<ZoneVideoGenerationResult> {
  const supabase = createAdminClient();

  const { data: zoneRow } = await supabase
    .from('zones')
    .select('id, name_es')
    .eq('id', input.zoneId)
    .maybeSingle();
  const zone = zoneRow as { id: string; name_es: string } | null;
  if (!zone) throw new TRPCError({ code: 'NOT_FOUND', message: 'Zone not found' });

  const [scores, market] = await Promise.all([
    getZoneScores(input.zoneId),
    getZoneMarketData(input.zoneId),
  ]);

  let projectId = input.projectId;
  if (!projectId) {
    const { data: project, error: projErr } = await supabase
      .from('studio_video_projects')
      .insert({
        user_id: input.userId,
        title: `Video de Zona — ${zone.name_es}`,
        status: 'draft',
        project_type: 'standard',
      })
      .select('id')
      .single();
    if (projErr || !project) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: projErr });
    }
    projectId = project.id;
  }

  const aiSummary = composeAiSummary(zone.name_es, scores, market);

  const { data, error } = await supabase
    .from('studio_zone_videos')
    .insert({
      project_id: projectId,
      user_id: input.userId,
      zone_id: input.zoneId,
      zone_name: zone.name_es,
      ie_scores_snapshot: scores as never,
      market_data: market as never,
      ai_summary: aiSummary,
    })
    .select('id, project_id, zone_name')
    .single();
  if (error || !data) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }

  return {
    zoneVideoId: data.id,
    projectId: data.project_id,
    zoneName: data.zone_name,
    scores,
    market,
    aiSummary,
  };
}

export function composeAiSummary(
  zoneName: string,
  scores: ZoneScoresSnapshot,
  market: ZoneMarketData,
): string {
  const lines: string[] = [];
  lines.push(`${zoneName} es una zona con datos verificados.`);
  if (scores.pulse !== null) {
    lines.push(`Pulse Score: ${scores.pulse.toFixed(1)} de 100.`);
  }
  if (market.precioPromedioM2) {
    lines.push(`Precio promedio por m²: $${market.precioPromedioM2.toLocaleString('es-MX')}.`);
  }
  if (market.trend30dPct !== null) {
    const sign = market.trend30dPct >= 0 ? '+' : '';
    lines.push(`Tendencia 30 días: ${sign}${market.trend30dPct.toFixed(1)}%.`);
  }
  if (market.amenidadesDestacadas.length > 0) {
    lines.push(`Destacan: ${market.amenidadesDestacadas.slice(0, 3).join(', ')}.`);
  }
  return lines.join(' ');
}
