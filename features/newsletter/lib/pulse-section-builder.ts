// BLOQUE 11.J.7 — Newsletter × Pulse section builder.
//
// Construye PulseSectionBundle para email (monthly MOM + zone-personalized):
//   - current_pulse:  última semana de zone_pulse_scores para la zona.
//   - delta_4w:       current - pulse de hace 4 semanas/meses.
//   - sparkline_svg:  16 semanas (4 meses) renderizadas inline SVG.
//   - detail_url:     deeplink a /indices/{indexCode}?colonia=... #vital-signs
//                     (VitalSigns component existe en features/pulse-score).
//
// El "index" por default para Pulse cross-link es 'PULSE' (no uno de los 15
// DMX indices porque Pulse tiene su propia ruta de detalle). Caller puede
// override indexCode si desea linkear a ranking específico. Si no hay data
// → devuelve null (caller decide si omitir sección).

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { PulseSectionBundle } from '../types';
import { generatePulseSparklineSVG } from './pulse-sparkline-svg';

export interface BuildPulseSectionOptions {
  readonly scopeId: string;
  readonly countryCode: string;
  readonly scopeType?: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly periodDate?: string; // anchor YYYY-MM-DD (default: el último disponible)
  readonly supabase?: SupabaseClient<Database>;
  readonly siteUrl?: string;
  readonly locale?: string;
  readonly indexCode?: string;
  readonly historyLimit?: number;
}

// 16 semanas ≈ 4 meses (Pulse corre mensual en H1 → practically 4 data points;
// H2 upgrade L-NN-PULSE-WEEKLY bumpeará a weekly). Para H1 usamos limit=16 y
// si devuelve menos (e.g. 4 puntos mensuales) el sparkline escala igual.
const DEFAULT_HISTORY_LIMIT = 16;
const DEFAULT_SITE_URL = 'https://desarrollosmx.com';
const DEFAULT_LOCALE = 'es-MX';
const DEFAULT_INDEX_CODE = 'PULSE';

interface PulseHistoryRow {
  readonly period_date: string;
  readonly pulse_score: number | null;
}

export async function fetchPulseHistory(
  supabase: SupabaseClient<Database>,
  opts: { scopeId: string; countryCode: string; limit: number },
): Promise<readonly PulseHistoryRow[]> {
  const { data, error } = await supabase
    .from('zone_pulse_scores')
    .select('period_date, pulse_score')
    .eq('scope_id', opts.scopeId)
    .eq('country_code', opts.countryCode)
    .order('period_date', { ascending: false })
    .limit(opts.limit);
  if (error) {
    throw new Error(`pulse_section_builder: query failed: ${error.message}`);
  }
  const rows = (data ?? []) as readonly PulseHistoryRow[];
  return rows;
}

// Dado history DESC (newest first), calcula delta_4w como:
//   current - value at index min(4, len-1) (contando desde newest).
// En H1 (mensual), este delta es en realidad delta_4m. Acepta nombre "4w"
// por contrato (renombrar post H2 weekly upgrade).
export function computeDelta4w(historyDesc: readonly PulseHistoryRow[]): number | null {
  if (historyDesc.length < 2) return null;
  const current = historyDesc[0];
  if (!current || current.pulse_score === null) return null;
  const idx = Math.min(4, historyDesc.length - 1);
  const past = historyDesc[idx];
  if (!past || past.pulse_score === null) return null;
  return Math.round((current.pulse_score - past.pulse_score) * 100) / 100;
}

function buildDetailUrl(
  siteUrl: string,
  locale: string,
  indexCode: string,
  scopeId: string,
): string {
  const trimmed = siteUrl.replace(/\/+$/, '');
  const encodedScope = encodeURIComponent(scopeId);
  return `${trimmed}/${locale}/indices/${indexCode}?colonia=${encodedScope}#vital-signs`;
}

export async function buildPulseSection(
  opts: BuildPulseSectionOptions,
): Promise<PulseSectionBundle | null> {
  const {
    scopeId,
    countryCode,
    scopeType = 'colonia',
    periodDate,
    supabase,
    siteUrl = DEFAULT_SITE_URL,
    locale = DEFAULT_LOCALE,
    indexCode = DEFAULT_INDEX_CODE,
    historyLimit = DEFAULT_HISTORY_LIMIT,
  } = opts;

  const client = supabase ?? createAdminClient();
  const rawHistory = await fetchPulseHistory(client, {
    scopeId,
    countryCode,
    limit: historyLimit,
  });

  // Si hay periodDate anchor, filtra history ≤ periodDate.
  const history = periodDate ? rawHistory.filter((r) => r.period_date <= periodDate) : rawHistory;

  if (history.length === 0) return null;

  const newest = history[0];
  if (!newest || newest.pulse_score === null) return null;

  const currentPulse = Math.round(newest.pulse_score * 100) / 100;
  const delta4w = computeDelta4w(history);

  // Para el SVG: necesitamos cronológico (oldest → newest).
  const seriesAsc = [...history]
    .reverse()
    .map((r) => r.pulse_score)
    .filter((v): v is number => v !== null);

  const sparklineSvg = generatePulseSparklineSVG(seriesAsc, {
    ariaLabel: `Tendencia Pulse ${scopeId}`,
  });

  const zoneLabel = await resolveZoneLabel({
    scopeType,
    scopeId,
    countryCode,
    supabase: client,
  });

  const detailUrl = buildDetailUrl(siteUrl, locale, indexCode, scopeId);

  return {
    scope_id: scopeId,
    zone_label: zoneLabel,
    current_pulse: currentPulse,
    delta_4w: delta4w,
    sparkline_svg: sparklineSvg,
    detail_url: detailUrl,
  };
}
