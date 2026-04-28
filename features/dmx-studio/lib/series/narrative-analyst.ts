// F14.F.9 Sprint 8 BIBLIA LATERAL 6 — Series narrative analyst.
// Analiza % obra real M02 desarrollos via cross-feature ADR-056 → sugiere proximo episodio.

import { TRPCError } from '@trpc/server';
import { getDesarrolloProgress } from '@/shared/lib/desarrollos-cross-feature';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface NarrativeRecommendation {
  readonly nextEpisodeNumber: number | null;
  readonly recommendedFocus: string;
  readonly urgencyLevel: 'low' | 'medium' | 'high';
  readonly reasoning: string;
  readonly progressPct: number | null;
  readonly currentPhase: string | null;
}

const PHASE_ORDER: ReadonlyArray<string> = [
  'planificacion',
  'construccion',
  'acabados',
  'amenidades',
  'entrega',
];

export async function analyzeProgressForRecommendation(
  seriesId: string,
): Promise<NarrativeRecommendation> {
  const supabase = createAdminClient();

  const { data: serie, error: serieErr } = await supabase
    .from('studio_series_projects')
    .select('id, desarrollo_id, episodes_count, episode_project_ids')
    .eq('id', seriesId)
    .maybeSingle();
  if (serieErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: serieErr });
  if (!serie) throw new TRPCError({ code: 'NOT_FOUND', message: 'Series not found' });

  const { data: episodes } = await supabase
    .from('studio_series_episodes')
    .select('id, episode_number, narrative_phase, status')
    .eq('series_id', seriesId)
    .order('episode_number', { ascending: true });

  const eps = episodes ?? [];
  const nextPending = eps.find((e) => e.status === 'pending' || e.status === 'recommended');

  let progressPct: number | null = null;
  let currentPhase: string | null = null;
  if (serie.desarrollo_id) {
    const progress = await getDesarrolloProgress(serie.desarrollo_id);
    progressPct = progress.pctCompleted;
    currentPhase = progress.currentPhase;
  }

  const urgency = computeUrgency(progressPct, nextPending?.narrative_phase ?? null, currentPhase);
  const reasoning = buildReasoning(progressPct, currentPhase, nextPending?.narrative_phase ?? null);

  return {
    nextEpisodeNumber: nextPending?.episode_number ?? null,
    recommendedFocus: nextPending?.narrative_phase ?? 'sin episodio pendiente',
    urgencyLevel: urgency,
    reasoning,
    progressPct,
    currentPhase,
  };
}

function computeUrgency(
  progressPct: number | null,
  nextEpisodePhase: string | null,
  currentPhase: string | null,
): 'low' | 'medium' | 'high' {
  if (!nextEpisodePhase || !currentPhase) return 'low';
  const nextIdx = PHASE_ORDER.indexOf(nextEpisodePhase);
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  if (nextIdx === -1 || currentIdx === -1) return 'low';
  if (currentIdx > nextIdx) return 'high';
  if (currentIdx === nextIdx && (progressPct ?? 0) > 70) return 'high';
  if (currentIdx === nextIdx) return 'medium';
  return 'low';
}

function buildReasoning(
  progressPct: number | null,
  currentPhase: string | null,
  nextPhase: string | null,
): string {
  if (!nextPhase) return 'Serie completa o sin episodios pendientes.';
  if (!currentPhase) return `Considera grabar episodio "${nextPhase}" pronto.`;
  if (currentPhase === nextPhase && (progressPct ?? 0) > 70) {
    return `Obra al ${progressPct}% en fase ${currentPhase}. Es momento ideal para grabar episodio "${nextPhase}".`;
  }
  if (PHASE_ORDER.indexOf(currentPhase) > PHASE_ORDER.indexOf(nextPhase)) {
    return `Obra ya supero fase ${nextPhase} (estas en ${currentPhase}). Graba episodio antes de que avance mas.`;
  }
  return `Obra en fase ${currentPhase} al ${progressPct ?? '?'}%. Episodio ${nextPhase} aun no urgente.`;
}
