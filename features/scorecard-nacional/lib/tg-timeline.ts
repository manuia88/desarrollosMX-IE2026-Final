// BLOQUE 11.I.10 (L113) — Trend Genome x Timeline Histórico Causal.
//
// Designed to be consumed by SUB-AGENT C's causal-timeline.ts as
// alphaJourneyHook parameter; devuelve un bundle con trayectoria alpha,
// señales early-mover (influencer_heat_zones) y narrativa journey opcional.
//
// No crea página pública directamente — causal-timeline lo integra dentro de
// /historia/[colonia].

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export type TgTimelineCausalHook = (
  prompt: string,
) => Promise<{ text: string; citations: readonly string[] }>;

export interface BuildTgTimelineOpts {
  readonly causalHook?: TgTimelineCausalHook;
}

export type EarlyMoverSignalType = 'chef' | 'gallery' | 'creator' | 'specialty_cafe';

export interface EarlyMoverSignal {
  readonly date: string;
  readonly signal_type: EarlyMoverSignalType;
  readonly count: number;
}

export interface AlphaTrajectoryPoint {
  readonly period_date: string;
  readonly alpha_score: number;
  readonly tier: string;
}

export interface TgTimelineBundle {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly alpha_trajectory: readonly AlphaTrajectoryPoint[];
  readonly early_mover_signals: readonly EarlyMoverSignal[];
  readonly journey_narrative_md: string;
}

interface AlphaRow {
  readonly zone_id: string;
  readonly alpha_score: number;
  readonly detected_at: string;
}

interface HeatRow {
  readonly zone_id: string;
  readonly period_date: string;
  readonly chef_count: number;
  readonly gallery_count: number;
  readonly creator_count: number;
  readonly specialty_cafe_count: number;
}

function classifyAlphaTier(score: number): string {
  if (score >= 80) return 'peaked';
  if (score >= 60) return 'alpha';
  if (score >= 40) return 'emerging';
  return 'pre-alpha';
}

// Pure helper: identify early-mover signals that appeared BEFORE the first
// alpha detection for a zone. Returns sorted ASC by date.
export function identifyEarlyMovers(
  heatHistory: readonly HeatRow[],
  firstAlphaDate: string | null,
): readonly EarlyMoverSignal[] {
  const out: EarlyMoverSignal[] = [];
  const cutoff = firstAlphaDate ?? null;

  for (const row of heatHistory) {
    const date = row.period_date;
    if (cutoff !== null && date >= cutoff) continue;
    if (row.chef_count > 0) out.push({ date, signal_type: 'chef', count: row.chef_count });
    if (row.gallery_count > 0) out.push({ date, signal_type: 'gallery', count: row.gallery_count });
    if (row.creator_count > 0) out.push({ date, signal_type: 'creator', count: row.creator_count });
    if (row.specialty_cafe_count > 0)
      out.push({
        date,
        signal_type: 'specialty_cafe',
        count: row.specialty_cafe_count,
      });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchAlphaTrajectory(
  supabase: SupabaseClient<Record<string, unknown>>,
  zoneId: string,
  countryCode: string,
): Promise<readonly AlphaRow[]> {
  const { data, error } = await supabase
    .from('zone_alpha_alerts' as never)
    .select('zone_id, alpha_score, detected_at')
    .eq('zone_id', zoneId)
    .eq('country_code', countryCode)
    .order('detected_at', { ascending: true });

  if (error) {
    console.warn('[tg-timeline] fetchAlphaTrajectory error', { error });
    return [];
  }
  return (data ?? []) as readonly AlphaRow[];
}

async function fetchHeatHistory(
  supabase: SupabaseClient<Record<string, unknown>>,
  zoneId: string,
  countryCode: string,
): Promise<readonly HeatRow[]> {
  const { data, error } = await supabase
    .from('influencer_heat_zones' as never)
    .select('zone_id, period_date, chef_count, gallery_count, creator_count, specialty_cafe_count')
    .eq('zone_id', zoneId)
    .eq('country_code', countryCode)
    .order('period_date', { ascending: true });

  if (error) {
    console.warn('[tg-timeline] fetchHeatHistory error', { error });
    return [];
  }
  return (data ?? []) as readonly HeatRow[];
}

function formatJourneyPrompt(params: {
  readonly zoneLabel: string;
  readonly trajectory: readonly AlphaTrajectoryPoint[];
  readonly earlyMovers: readonly EarlyMoverSignal[];
  readonly firstAlphaDate: string | null;
}): string {
  const firstChef = params.earlyMovers.find((s) => s.signal_type === 'chef');
  const firstGallery = params.earlyMovers.find((s) => s.signal_type === 'gallery');
  const cross60 = params.trajectory.find((t) => t.alpha_score >= 60);

  return [
    `Cuenta cómo llegó ${params.zoneLabel} a fase alpha (~250 palabras es-MX, markdown).`,
    '',
    'Datos verificables:',
    `- First alpha alert: ${params.firstAlphaDate ?? 'n/d'}`,
    `- Score cruzó 60 en: ${cross60?.period_date ?? 'n/d'}`,
    `- First chef signal: ${firstChef ? `${firstChef.date} (count=${firstChef.count})` : 'n/d'}`,
    `- First gallery signal: ${firstGallery ? `${firstGallery.date} (count=${firstGallery.count})` : 'n/d'}`,
    `- Total early-mover signals antes del primer alpha: ${params.earlyMovers.length}`,
    '',
    'Estructura: 1) qué señales aparecieron primero, 2) cuándo cruzó alpha, 3) quiénes fueron los early movers. Tono editorial, cero hype.',
  ].join('\n');
}

function buildStubJourney(
  zoneLabel: string,
  trajectory: readonly AlphaTrajectoryPoint[],
  earlyMovers: readonly EarlyMoverSignal[],
): string {
  const cross60 = trajectory.find((t) => t.alpha_score >= 60);
  const firstSignal = earlyMovers[0];
  const parts: string[] = [`Journey alpha de **${zoneLabel}**.`];
  if (firstSignal) {
    parts.push(
      `Primera señal early-mover: ${firstSignal.signal_type} (${firstSignal.count}) en ${firstSignal.date}.`,
    );
  }
  if (cross60) {
    parts.push(`Alpha_score cruzó 60 el ${cross60.period_date}.`);
  } else {
    parts.push('Aún sin cruzar umbral alpha.');
  }
  parts.push(`Total señales early-mover: ${earlyMovers.length}.`);
  return parts.join(' ');
}

export async function buildTgTimeline(
  zoneId: string,
  countryCode: string,
  opts: BuildTgTimelineOpts = {},
): Promise<TgTimelineBundle> {
  const supabase = createAdminClient();
  const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

  const [alphaRows, heatRows] = await Promise.all([
    fetchAlphaTrajectory(client, zoneId, countryCode),
    fetchHeatHistory(client, zoneId, countryCode),
  ]);

  const trajectory: readonly AlphaTrajectoryPoint[] = alphaRows.map((r) => ({
    period_date: r.detected_at.slice(0, 10),
    alpha_score: r.alpha_score,
    tier: classifyAlphaTier(r.alpha_score),
  }));

  const firstAlphaDate = alphaRows[0]?.detected_at.slice(0, 10) ?? null;
  const earlyMovers = identifyEarlyMovers(heatRows, firstAlphaDate);

  let journeyMd = buildStubJourney(zoneId, trajectory, earlyMovers);
  if (opts.causalHook) {
    const prompt = formatJourneyPrompt({
      zoneLabel: zoneId,
      trajectory,
      earlyMovers,
      firstAlphaDate,
    });
    try {
      const result = await opts.causalHook(prompt);
      journeyMd = result.text;
    } catch (err) {
      console.warn('[tg-timeline] causalHook error', { err });
    }
  }

  return {
    zone_id: zoneId,
    zone_label: zoneId,
    alpha_trajectory: trajectory,
    early_mover_signals: earlyMovers,
    journey_narrative_md: journeyMd,
  };
}

export { buildStubJourney, classifyAlphaTier, formatJourneyPrompt };
