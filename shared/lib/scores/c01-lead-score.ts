// FASE 15 v3 — B.6 Lead Score C01 IA engine
// Reference: ADR-060 + M13 APPEND v3 (Onyx anchor 21x conversion <5min response)
//
// Computa lead_score 0-100 sobre tabla `leads` (BD canon FK lead_scores.lead_id → leads.id).
// Factors weighted 0-100 cada uno, agregados por pesos:
//   30% engagement: count touchpoints (proxy via journey_executions + lead_sources signals)
//   30% intent:     form submissions / meeting scheduled / offer requested
//   20% demographics: budget match + zone match + financial qualification (qualification_score)
//   20% recency:    días desde último update (exponential decay)
//
// Memoria 13 escalable: jsonb extensible — touchpoints H2 (lead_touchpoints table L-NEW post-launch)
// flag is_partial_signal=true + missing_signals=['lead_touchpoints','meeting_scheduled_v2'] explícito.
//
// Patrón base: shared/lib/scores/unit-demand-score.ts (commit 30a56f1).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface LeadScoreFactors {
  readonly engagement: number;
  readonly intent: number;
  readonly demographics: number;
  readonly recency: number;
  readonly engagement_signals: {
    readonly touchpoints_30d: number;
    readonly journey_executions_active: number;
  };
  readonly intent_signals: {
    readonly form_submissions: number;
    readonly visit_scheduled: boolean;
    readonly offer_requested: boolean;
  };
  readonly demographics_signals: {
    readonly qualification_score: number;
    readonly has_zone_match: boolean;
    readonly has_budget_in_metadata: boolean;
  };
  readonly recency_signals: {
    readonly days_since_update: number;
    readonly days_since_creation: number;
  };
  readonly is_partial_signal: boolean;
  readonly missing_signals: readonly string[];
  readonly computed_at: string;
}

export interface LeadScoreResult {
  readonly lead_id: string;
  readonly score: number;
  readonly tier: 'cold' | 'warm' | 'hot';
  readonly factors: LeadScoreFactors;
  readonly model_version: string;
  readonly ttl_until: string;
}

interface ComputeContext {
  readonly supabase: SupabaseClient;
}

const MODEL_VERSION = 'c01-v1';
const TTL_HOURS = 1;

const WEIGHT_ENGAGEMENT = 0.3;
const WEIGHT_INTENT = 0.3;
const WEIGHT_DEMOGRAPHICS = 0.2;
const WEIGHT_RECENCY = 0.2;

const MAX_TOUCHPOINTS_30D = 10;
const MAX_JOURNEYS_ACTIVE = 3;

const HOT_THRESHOLD = 75;
const WARM_THRESHOLD = 40;

const RECENCY_HALF_LIFE_DAYS = 14;

export async function computeLeadScore(
  leadId: string,
  ctx: ComputeContext,
): Promise<LeadScoreResult> {
  const { supabase } = ctx;
  const now = Date.now();

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select(
      'id, status, qualification_score, source_id, zone_id, metadata, contact_email, contact_phone, created_at, updated_at',
    )
    .eq('id', leadId)
    .single();

  if (leadErr || !lead) {
    return zeroResult(leadId, 'lead_not_found');
  }

  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [journeysActiveRes, journeysAllRes] = await Promise.all([
    supabase
      .from('journey_executions')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .in('status', ['pending', 'running']),
    supabase
      .from('journey_executions')
      .select('id, started_at', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .gte('started_at', since30d),
  ]);

  const journeysActive = journeysActiveRes.count ?? 0;
  const touchpoints30d = journeysAllRes.count ?? 0;

  const engagement = clamp01(
    (touchpoints30d / MAX_TOUCHPOINTS_30D) * 0.7 + (journeysActive / MAX_JOURNEYS_ACTIVE) * 0.3,
  );

  const status = String(lead.status ?? '').toLowerCase();
  const visitScheduled =
    status === 'visita' || status === 'visit_scheduled' || status === 'visiting';
  const offerRequested = status === 'oferta' || status === 'offer' || status === 'closed';
  const formSubmissions = touchpoints30d > 0 ? 1 : 0;

  const intentRaw =
    (offerRequested ? 0.6 : 0) + (visitScheduled ? 0.3 : 0) + (formSubmissions > 0 ? 0.1 : 0);
  const intent = clamp01(intentRaw);

  const qualScore = Number(lead.qualification_score ?? 0) / 100;
  const metadata = (lead.metadata ?? {}) as Record<string, unknown>;
  const hasBudget =
    typeof metadata.budget_min === 'number' || typeof metadata.budget_max === 'number';
  const hasZoneMatch = lead.zone_id != null && lead.zone_id !== '';

  const demographics = clamp01(qualScore * 0.6 + (hasBudget ? 0.2 : 0) + (hasZoneMatch ? 0.2 : 0));

  const updatedAt = lead.updated_at ? new Date(lead.updated_at).getTime() : now;
  const createdAt = lead.created_at ? new Date(lead.created_at).getTime() : now;
  const daysSinceUpdate = Math.max(0, Math.floor((now - updatedAt) / (24 * 60 * 60 * 1000)));
  const daysSinceCreation = Math.max(0, Math.floor((now - createdAt) / (24 * 60 * 60 * 1000)));

  const recency = clamp01(Math.exp(-Math.LN2 * (daysSinceUpdate / RECENCY_HALF_LIFE_DAYS)));

  const score = Math.round(
    (engagement * WEIGHT_ENGAGEMENT +
      intent * WEIGHT_INTENT +
      demographics * WEIGHT_DEMOGRAPHICS +
      recency * WEIGHT_RECENCY) *
      100,
  );

  const factors: LeadScoreFactors = {
    engagement: Math.round(engagement * 100),
    intent: Math.round(intent * 100),
    demographics: Math.round(demographics * 100),
    recency: Math.round(recency * 100),
    engagement_signals: {
      touchpoints_30d: touchpoints30d,
      journey_executions_active: journeysActive,
    },
    intent_signals: {
      form_submissions: formSubmissions,
      visit_scheduled: visitScheduled,
      offer_requested: offerRequested,
    },
    demographics_signals: {
      qualification_score: Number(lead.qualification_score ?? 0),
      has_zone_match: hasZoneMatch,
      has_budget_in_metadata: hasBudget,
    },
    recency_signals: {
      days_since_update: daysSinceUpdate,
      days_since_creation: daysSinceCreation,
    },
    is_partial_signal: true,
    missing_signals: ['lead_touchpoints', 'meeting_scheduled_v2', 'wa_inbound_count'],
    computed_at: new Date(now).toISOString(),
  };

  const ttlUntil = new Date(now + TTL_HOURS * 60 * 60 * 1000).toISOString();

  return {
    lead_id: leadId,
    score: Math.min(100, Math.max(0, score)),
    tier: scoreToTier(score),
    factors,
    model_version: MODEL_VERSION,
    ttl_until: ttlUntil,
  };
}

export async function persistLeadScore(
  result: LeadScoreResult,
  ctx: ComputeContext,
): Promise<void> {
  const { supabase } = ctx;

  await supabase.from('lead_scores').upsert(
    {
      lead_id: result.lead_id,
      score: result.score,
      factors: result.factors as never,
      model_version: result.model_version,
      computed_at: result.factors.computed_at,
      ttl_until: result.ttl_until,
    },
    { onConflict: 'lead_id' },
  );
}

export async function batchComputeStaleLeadScores(
  ctx: ComputeContext,
  limit = 200,
): Promise<readonly LeadScoreResult[]> {
  const { supabase } = ctx;
  const nowIso = new Date().toISOString();

  const { data: stale, error } = await supabase
    .from('lead_scores')
    .select('lead_id, ttl_until')
    .lte('ttl_until', nowIso)
    .limit(limit);

  if (error || !stale) return [];

  const cachedIds = new Set((stale ?? []).map((s) => s.lead_id));

  const { data: untrackedLeads } = await supabase
    .from('leads')
    .select('id')
    .not('id', 'in', `(${[...cachedIds].length > 0 ? [...cachedIds].join(',') : 'null'})`)
    .limit(Math.max(0, limit - cachedIds.size));

  const idsToCompute = [
    ...cachedIds,
    ...((untrackedLeads ?? []).map((l) => l.id) as readonly string[]),
  ].slice(0, limit);

  const results: LeadScoreResult[] = [];
  for (const id of idsToCompute) {
    try {
      const r = await computeLeadScore(id, ctx);
      await persistLeadScore(r, ctx);
      results.push(r);
    } catch {
      // continue on individual lead failure; cron logs aggregate
    }
  }

  return results;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function scoreToTier(score: number): 'cold' | 'warm' | 'hot' {
  if (score >= HOT_THRESHOLD) return 'hot';
  if (score >= WARM_THRESHOLD) return 'warm';
  return 'cold';
}

function zeroResult(leadId: string, reason: string): LeadScoreResult {
  const now = Date.now();
  return {
    lead_id: leadId,
    score: 0,
    tier: 'cold',
    factors: {
      engagement: 0,
      intent: 0,
      demographics: 0,
      recency: 0,
      engagement_signals: { touchpoints_30d: 0, journey_executions_active: 0 },
      intent_signals: { form_submissions: 0, visit_scheduled: false, offer_requested: false },
      demographics_signals: {
        qualification_score: 0,
        has_zone_match: false,
        has_budget_in_metadata: false,
      },
      recency_signals: { days_since_update: 0, days_since_creation: 0 },
      is_partial_signal: true,
      missing_signals: ['lead_touchpoints', reason],
      computed_at: new Date(now).toISOString(),
    },
    model_version: MODEL_VERSION,
    ttl_until: new Date(now + TTL_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export const __c01_constants = {
  HOT_THRESHOLD,
  WARM_THRESHOLD,
  MODEL_VERSION,
  TTL_HOURS,
} as const;
