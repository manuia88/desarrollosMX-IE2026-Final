// Alpha Alerts Engine — BLOQUE 11.H.4.
// Detecta zonas cruzando threshold alpha (score ≥70) y persiste alerts en
// public.zone_alpha_alerts. Applies UPGRADE #1 drift detection: cuando
// |score_drift_pct| > 25% → needs_review = true (gate humano, no notificar).
//
// Entrypoint: detectNewAlphaZones({ periodDate, supabase, calculateFn?, zoneIds? }).
//
// NO envía notificaciones reales (Slack/email/WhatsApp) — solo cuenta
// subscribers vía zone_alert_subscriptions y guarda subscribers_notified.
// Envío real vive en service posterior (FASE 12+).

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AlphaAlertDetection,
  AlphaComputeResult,
  AlphaScopeType,
} from '@/features/trend-genome/types';
import { type CalculateTrendGenomeParams, calculateTrendGenome } from './trend-genome';

// ---------- Loose Supabase helper ----------

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---------- Constants ----------

const ALPHA_SCORE_THRESHOLD = 70;
const DRIFT_NEEDS_REVIEW_PCT = 25;
const ZONA_SNAPSHOTS_LOOKBACK_DAYS = 120;
const DEFAULT_SCOPE_TYPE: AlphaScopeType = 'colonia';
const DEFAULT_COUNTRY_CODE = 'MX';

// ---------- Zone discovery (mirror flow-aggregator pattern) ----------

async function discoverZonesViaSnapshots(
  supabase: SupabaseClient,
  periodDate: string,
): Promise<readonly string[]> {
  try {
    const anchor = new Date(`${periodDate}T00:00:00Z`);
    const lookback = new Date(anchor.getTime());
    lookback.setUTCDate(lookback.getUTCDate() - ZONA_SNAPSHOTS_LOOKBACK_DAYS);
    const fromISO = lookback.toISOString().slice(0, 10);
    const res = await castFrom(supabase, 'zona_snapshots')
      .select('zone_id')
      .eq('country_code', DEFAULT_COUNTRY_CODE)
      .gte('period', fromISO)
      .lte('period', periodDate)
      .limit(5000);
    if (res.error || !res.data) return [];
    const rows = res.data as unknown as Array<{ zone_id: string }>;
    const uniq = new Set<string>();
    for (const r of rows) {
      if (r?.zone_id) uniq.add(r.zone_id);
    }
    return [...uniq];
  } catch {
    return [];
  }
}

// ---------- Previous alert lookup ----------

async function fetchPreviousAlertScore(
  supabase: SupabaseClient,
  zoneId: string,
  scopeType: AlphaScopeType,
  countryCode: string,
): Promise<number | null> {
  try {
    const res = await castFrom(supabase, 'zone_alpha_alerts')
      .select('alpha_score')
      .eq('zone_id', zoneId)
      .eq('scope_type', scopeType)
      .eq('country_code', countryCode)
      .order('detected_at', { ascending: false })
      .limit(1);
    if (res.error || !res.data) return null;
    const rows = res.data as unknown as Array<{ alpha_score: unknown }>;
    const first = rows[0];
    if (!first || !isFiniteNumber(first.alpha_score)) return null;
    return first.alpha_score;
  } catch {
    return null;
  }
}

// ---------- Drift detection (UPGRADE #1) ----------

export function computeScoreDriftPct(current: number, previous: number | null): number | null {
  if (previous === null) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function isDriftNeedingReview(driftPct: number | null): boolean {
  if (driftPct === null) return false;
  return Math.abs(driftPct) > DRIFT_NEEDS_REVIEW_PCT;
}

// ---------- Subscribers notification count ----------

export async function notifySubscribers(
  detection: AlphaAlertDetection,
  countryCode: string,
  supabase: SupabaseClient,
): Promise<number> {
  // needs_review → gate humano, 0 notifications se cuentan en la alert row.
  if (detection.needs_review) return 0;

  try {
    const res = await castFrom(supabase, 'zone_alert_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', detection.zone_id)
      .eq('country_code', countryCode)
      .eq('active', true)
      .in('channel', ['email', 'whatsapp', 'push']);
    if (res.error) return 0;
    const count =
      typeof (res as { count?: unknown }).count === 'number'
        ? ((res as { count: number }).count ?? 0)
        : 0;
    return count;
  } catch {
    return 0;
  }
}

// ---------- Alert row upsert ----------

interface AlphaAlertRow extends Record<string, unknown> {
  zone_id: string;
  scope_type: AlphaScopeType;
  country_code: string;
  alpha_score: number;
  time_to_mainstream_months: number | null;
  signals: Record<string, unknown>;
  subscribers_notified: number;
  is_active: boolean;
  detected_at: string;
}

async function insertAlphaAlert(
  supabase: SupabaseClient,
  row: AlphaAlertRow,
): Promise<{ ok: boolean }> {
  try {
    const res = await castFrom(supabase, 'zone_alpha_alerts').insert(row as never);
    if (res.error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ---------- Main detector ----------

export interface DetectNewAlphaZonesParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient;
  readonly calculateFn?: (p: CalculateTrendGenomeParams) => Promise<AlphaComputeResult>;
  readonly zoneIds?: readonly string[];
  readonly scopeType?: AlphaScopeType;
  readonly countryCode?: string;
  readonly fetchImpl?: typeof fetch;
  readonly apifyToken?: string;
}

export interface DetectNewAlphaZonesResult {
  readonly detections: readonly AlphaAlertDetection[];
  readonly alerts_triggered: number;
}

export async function detectNewAlphaZones(
  params: DetectNewAlphaZonesParams,
): Promise<DetectNewAlphaZonesResult> {
  const scopeType = params.scopeType ?? DEFAULT_SCOPE_TYPE;
  const countryCode = params.countryCode ?? DEFAULT_COUNTRY_CODE;
  const calculate = params.calculateFn ?? calculateTrendGenome;

  const zoneIds =
    params.zoneIds ?? (await discoverZonesViaSnapshots(params.supabase, params.periodDate));

  if (zoneIds.length === 0) {
    return { detections: [], alerts_triggered: 0 };
  }

  const detections: AlphaAlertDetection[] = [];
  let alertsTriggered = 0;

  for (const zoneId of zoneIds) {
    try {
      const result = await calculate({
        zoneId,
        scopeType,
        countryCode,
        period: params.periodDate,
        supabase: params.supabase,
        ...(params.fetchImpl ? { fetchImpl: params.fetchImpl } : {}),
        ...(params.apifyToken ? { apifyToken: params.apifyToken } : {}),
      });

      const previousScore = await fetchPreviousAlertScore(
        params.supabase,
        zoneId,
        scopeType,
        countryCode,
      );
      const driftPct = computeScoreDriftPct(result.alpha_score, previousScore);
      const needsReview = isDriftNeedingReview(driftPct);
      const isNewAlpha =
        result.alpha_score >= ALPHA_SCORE_THRESHOLD &&
        (previousScore === null || previousScore < ALPHA_SCORE_THRESHOLD);

      const detection: AlphaAlertDetection = {
        zone_id: zoneId,
        scope_type: scopeType,
        alpha_score: result.alpha_score,
        previous_score: previousScore,
        score_drift_pct: driftPct !== null ? Number(driftPct.toFixed(2)) : null,
        needs_review: needsReview,
        time_to_mainstream_months: result.time_to_mainstream_months,
        is_new_alpha: isNewAlpha,
      };
      detections.push(detection);

      if (result.alpha_score >= ALPHA_SCORE_THRESHOLD) {
        // Persist alert — even needs_review preserves the row for humano review;
        // needs_review flag vive en signals payload.
        const subscribersNotified = await notifySubscribers(
          detection,
          countryCode,
          params.supabase,
        );
        const signalsForPersist: Record<string, unknown> = {
          ...result.signals_jsonb,
          needs_review: needsReview,
          score_drift_pct: detection.score_drift_pct,
          previous_score: previousScore,
          is_new_alpha: isNewAlpha,
        };
        const row: AlphaAlertRow = {
          zone_id: zoneId,
          scope_type: scopeType,
          country_code: countryCode,
          alpha_score: result.alpha_score,
          time_to_mainstream_months: result.time_to_mainstream_months,
          signals: signalsForPersist,
          subscribers_notified: subscribersNotified,
          is_active: true,
          detected_at: new Date().toISOString(),
        };
        const insert = await insertAlphaAlert(params.supabase, row);
        if (insert.ok) alertsTriggered += 1;
      }
    } catch {
      // Per-zone failure no tumba el batch.
    }
  }

  return { detections, alerts_triggered: alertsTriggered };
}
