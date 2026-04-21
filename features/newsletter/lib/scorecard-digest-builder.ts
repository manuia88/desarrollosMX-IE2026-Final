// BLOQUE 11.J.6 — Scorecard Nacional × Newsletter digest builder.
//
// Construye ScorecardDigestBundle en dos modos:
//   - 'preview':  teaser publicado ~2 meses antes del release_date del reporte.
//                 Extrae snippet ejecutivo (primeras ~200 palabras de
//                 narrative_md) + CTA "Pre-registrate para acceso early".
//   - 'post':     recap post-publicación con top 3 hallazgos + CTA descarga
//                 reporte completo.
//
// Headline determinístico (sin LLM) usando hero_insights del reporte:
//   "{periodLabel} Scorecard Nacional — {top_magnet} lidera migración,
//    {alpha_leader} sorpresa alpha"
//
// Query: public.scorecard_national_reports WHERE report_id=reportId.
// Si published_at=null y mode='post' → throws (post requiere publicación real).
// Si mode='preview' y published_at=null → release_date = now() + 2 meses.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { HeroInsight, ScorecardNationalReportRow } from '@/features/scorecard-nacional/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { ScorecardDigestBundle } from '../types';

export type ScorecardDigestMode = 'preview' | 'post';

export interface BuildScorecardDigestOptions {
  readonly reportId: string;
  readonly mode: ScorecardDigestMode;
  readonly supabase?: SupabaseClient<Database>;
  readonly siteUrl?: string;
  readonly locale?: string;
  readonly now?: Date;
}

// Word count para snippet executive summary (approx 200 palabras).
const PREVIEW_WORD_LIMIT = 200;
const POST_WORD_LIMIT = 260;
const DEFAULT_SITE_URL = 'https://desarrollosmx.com';
const DEFAULT_LOCALE = 'es-MX';
const PREVIEW_LEAD_DAYS = 60; // ~2 meses

type ReportRow = ScorecardNationalReportRow;

// Extracción del primer párrafo(s) hasta `wordLimit` palabras. Mantiene
// saltos de línea, preserva markdown simple (link, bold) sin renderizarlo.
export function extractExecutiveSnippet(
  narrativeMd: string | null | undefined,
  wordLimit: number = PREVIEW_WORD_LIMIT,
): string {
  if (!narrativeMd) return '';
  // Strip heading markers (#) y blockquotes (>) al inicio de línea.
  const cleaned = narrativeMd
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .trim();

  const words = cleaned.split(/\s+/);
  if (words.length <= wordLimit) return cleaned;
  return `${words.slice(0, wordLimit).join(' ').trim()}…`;
}

// Deriva label humano del period_date (YYYY-MM-DD) + period_type.
// period_type ya viene del row — no hay adivinanza.
export function formatPeriodLabel(
  periodDate: string,
  periodType: ReportRow['period_type'],
): string {
  const year = periodDate.slice(0, 4);
  const month = Number.parseInt(periodDate.slice(5, 7), 10);
  if (periodType === 'annual') return `Anual ${year}`;
  if (periodType === 'quarterly') {
    const q = Math.floor((month - 1) / 3) + 1;
    return `${year} Q${q}`;
  }
  return `${month}/${year}`;
}

interface HeroLookup {
  readonly topMagnetLabel: string | null;
  readonly alphaLeaderLabel: string | null;
  readonly topInsights: readonly HeroInsight[];
}

function toHeroInsight(raw: unknown): HeroInsight | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;
  const zoneLabel = obj.zone_label;
  const headline = obj.headline;
  if (typeof kind !== 'string' || typeof zoneLabel !== 'string' || typeof headline !== 'string') {
    return null;
  }
  const value = typeof obj.value === 'number' ? obj.value : null;
  const delta = typeof obj.delta === 'number' ? obj.delta : null;
  const unit = typeof obj.unit === 'string' ? obj.unit : 'score_0_100';
  const zoneId = typeof obj.zone_id === 'string' ? obj.zone_id : null;
  return {
    kind: kind as HeroInsight['kind'],
    zone_id: zoneId,
    zone_label: zoneLabel,
    headline,
    value,
    delta,
    unit: unit as HeroInsight['unit'],
  };
}

export function resolveHeroLookup(heroInsightsRaw: readonly unknown[] | null): HeroLookup {
  const insights: HeroInsight[] = [];
  for (const raw of heroInsightsRaw ?? []) {
    const parsed = toHeroInsight(raw);
    if (parsed) insights.push(parsed);
  }
  const topMagnet = insights.find((h) => h.kind === 'top_magnet');
  const alphaLeader = insights.find((h) => h.kind === 'alpha_emerging');
  return {
    topMagnetLabel: topMagnet?.zone_label ?? null,
    alphaLeaderLabel: alphaLeader?.zone_label ?? null,
    topInsights: insights.slice(0, 3),
  };
}

// Headline determinístico para subject+header del email. Nunca invoca LLM.
export function buildDeterministicHeadline(periodLabel: string, lookup: HeroLookup): string {
  const magnet = lookup.topMagnetLabel;
  const alpha = lookup.alphaLeaderLabel;
  if (magnet && alpha) {
    return `${periodLabel} Scorecard Nacional — ${magnet} lidera migración, ${alpha} sorpresa alpha`;
  }
  if (magnet) {
    return `${periodLabel} Scorecard Nacional — ${magnet} lidera migración`;
  }
  if (alpha) {
    return `${periodLabel} Scorecard Nacional — ${alpha} sorpresa alpha`;
  }
  return `${periodLabel} Scorecard Nacional — resumen del trimestre`;
}

function addDaysIso(base: Date, days: number): string {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

function resolveReleaseDate(row: ReportRow, mode: ScorecardDigestMode, now: Date): string {
  if (row.published_at) return row.published_at.slice(0, 10);
  if (mode === 'preview') return addDaysIso(now, PREVIEW_LEAD_DAYS);
  // post mode sin published_at no debería ocurrir — caller debe validar.
  return now.toISOString().slice(0, 10);
}

function buildCtaUrl(siteUrl: string, locale: string, reportId: string): string {
  const trimmed = siteUrl.replace(/\/+$/, '');
  return `${trimmed}/${locale}/scorecard-nacional/${reportId}`;
}

export async function buildScorecardDigest(
  opts: BuildScorecardDigestOptions,
): Promise<ScorecardDigestBundle> {
  const {
    reportId,
    mode,
    supabase,
    siteUrl = DEFAULT_SITE_URL,
    locale = DEFAULT_LOCALE,
    now = new Date(),
  } = opts;

  const client = supabase ?? createAdminClient();
  const { data, error } = await client
    .from('scorecard_national_reports')
    .select(
      'id, report_id, period_type, period_date, country_code, pdf_url, narrative_md, data_snapshot, published_at, hero_insights, press_kit_url, created_at',
    )
    .eq('report_id', reportId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`scorecard_digest_builder: query failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`scorecard_digest_builder: report_id ${reportId} not found`);
  }

  const row = data as unknown as ReportRow;

  if (mode === 'post' && !row.published_at) {
    throw new Error(
      `scorecard_digest_builder: report ${reportId} requested mode=post but published_at is null`,
    );
  }

  const periodLabel = formatPeriodLabel(row.period_date, row.period_type);
  const heroInsightsRaw = Array.isArray(row.hero_insights) ? row.hero_insights : [];
  const lookup = resolveHeroLookup(heroInsightsRaw);
  const wordLimit = mode === 'preview' ? PREVIEW_WORD_LIMIT : POST_WORD_LIMIT;
  const snippet = extractExecutiveSnippet(row.narrative_md, wordLimit);
  const headline = buildDeterministicHeadline(periodLabel, lookup);
  const releaseDate = resolveReleaseDate(row, mode, now);
  const ctaUrl = buildCtaUrl(siteUrl, locale, reportId);

  return {
    report_id: row.report_id,
    period_type: 'quarterly',
    period_date: row.period_date,
    preview_paragraph: snippet,
    headline,
    release_date: releaseDate,
    cta_url: ctaUrl,
  };
}
