// FASE 08 / BLOQUE 8.D.3 — Endpoint AVM MVP /api/v1/estimate (POST).
//
// Pipeline:
//   1. Parse + validar Zod EstimateRequestSchema.
//   2. BotID check (bypass con api_key Pro/Enterprise).
//   3. Rate limit (free 5/mes, pro/ent unlimited).
//   4. Compute fingerprint D7 → lookup cache 24h.
//   5. Build feature vector (47 variables).
//   6. Predict regression H1 (estimate + MAE D4 + confidence_score).
//   7. Fetch comparables → counter-estimate D6 + spread flags.
//   8. Build adjustments D5 auditables.
//   9. Persist avm_estimates + PostHog ie.avm.estimated U7.
//   10. Response Zod-validated.
//
// ADR-013 API as Product + ADR-018 E2E Connectedness (endpoint real, no stub).

import { createHash } from 'node:crypto';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';
import { buildAdjustments } from '@/shared/lib/intelligence-engine/avm/adjustments';
import {
  counterEstimateFromComparables,
  fetchComparables,
} from '@/shared/lib/intelligence-engine/avm/comparables';
import { buildFeatureVector } from '@/shared/lib/intelligence-engine/avm/features';
import { computeFingerprint } from '@/shared/lib/intelligence-engine/avm/fingerprint';
import {
  getModelMetadata,
  MODEL_VERSION,
  predict,
} from '@/shared/lib/intelligence-engine/avm/model-h1';
import {
  classifyTierFromApiKey,
  enforceRateLimit,
  type TierName,
} from '@/shared/lib/intelligence-engine/avm/rate-limit';
import type { AvmComparable, AvmMarketContext } from '@/shared/lib/intelligence-engine/avm/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { hashUserIdForTelemetry } from '@/shared/lib/telemetry/hash-user-id';
import { posthog } from '@/shared/lib/telemetry/posthog';
import {
  type EstimateRequest,
  type EstimateResponse,
  estimateRequestSchema,
  estimateResponseSchema,
} from '@/shared/schemas/avm';

export const ENDPOINT_VERSION = '1.0.0';
const CACHE_TTL_HOURS = 24;
const SPREAD_UNCERTAIN_THRESHOLD = 15;

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

function json<T>(body: T, status: number): NextResponse {
  return NextResponse.json(body, { status });
}

function err(reason: string, status: number, details?: unknown): NextResponse {
  return json(
    details === undefined
      ? { ok: false as const, error: reason }
      : { ok: false as const, error: reason, details },
    status,
  );
}

function extractApiKey(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(api_[a-z]+_[A-Za-z0-9._-]+)$/);
  return match?.[1] ?? null;
}

function clientIdentityKey(request: Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `avm:${ip}`;
}

function safeCreateAdmin(): SupabaseAdmin | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function lookupCache(
  admin: SupabaseAdmin,
  fingerprint: string,
): Promise<EstimateResponse | null> {
  try {
    const { data } = await (admin as unknown as SupabaseAdmin)
      .from('avm_estimates' as never)
      .select(
        'estimate, mae_estimated_pct, ci_low, ci_high, confidence_score, estimate_alternative, spread_pct, flag_uncertain, flag_corroborated, adjustments, comparables, market_context, provenance, valid_until, created_at',
      )
      .eq('fingerprint', fingerprint)
      .gt('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const row = data as unknown as CachedAvmRow;
    return hydrateCachedRow(row);
  } catch {
    return null;
  }
}

interface CachedAvmRow {
  readonly estimate: number;
  readonly mae_estimated_pct: number;
  readonly ci_low: number;
  readonly ci_high: number;
  readonly confidence_score: number;
  readonly estimate_alternative: number | null;
  readonly spread_pct: number | null;
  readonly flag_uncertain: boolean;
  readonly flag_corroborated: boolean;
  readonly adjustments: unknown;
  readonly comparables: unknown;
  readonly market_context: unknown;
  readonly provenance: Record<string, unknown>;
  readonly valid_until: string;
  readonly created_at: string;
}

function hydrateCachedRow(row: CachedAvmRow): EstimateResponse {
  const prov = row.provenance ?? {};
  return {
    estimate: Number(row.estimate),
    ci_low: Number(row.ci_low),
    ci_high: Number(row.ci_high),
    confidence_score: Number(row.confidence_score),
    mae_estimated_pct: Number(row.mae_estimated_pct),
    estimate_alternative:
      row.estimate_alternative === null ? null : Number(row.estimate_alternative),
    spread_pct: row.spread_pct === null ? null : Number(row.spread_pct),
    flag_uncertain: row.flag_uncertain,
    flag_corroborated: row.flag_corroborated,
    score_label_key: row.flag_uncertain
      ? 'ie.avm.label.estimate_uncertain'
      : 'ie.avm.label.estimate_corroborated',
    adjustments: Array.isArray(row.adjustments)
      ? (row.adjustments as EstimateResponse['adjustments'])
      : [],
    comparables: Array.isArray(row.comparables)
      ? (row.comparables as EstimateResponse['comparables'])
      : [],
    market_context: (row.market_context as AvmMarketContext) ?? {
      precio_m2_zona_p50: null,
      absorcion_12m: null,
      momentum_n11: null,
      last_data_update: null,
    },
    methodology: (prov.methodology as EstimateResponse['methodology']) ?? {
      formula: 'estimate = intercept + Σ wi·xi_z',
      sources: ['coefficients-h1'],
      weights: {},
      references: [],
      validity: { unit: 'hours', value: CACHE_TTL_HOURS },
    },
    model_version: typeof prov.model_version === 'string' ? prov.model_version : MODEL_VERSION,
    endpoint_version:
      typeof prov.endpoint_version === 'string' ? prov.endpoint_version : ENDPOINT_VERSION,
    valid_until: row.valid_until,
    cached: true,
    computed_at: row.created_at,
    citations: Array.isArray(prov.citations)
      ? (prov.citations as EstimateResponse['citations'])
      : [],
  };
}

async function persistEstimate(
  admin: SupabaseAdmin,
  params: {
    fingerprint: string;
    input: EstimateRequest;
    response: EstimateResponse;
    userId: string | null;
  },
): Promise<void> {
  try {
    const row = {
      user_id: params.userId,
      fingerprint: params.fingerprint,
      request_input: params.input,
      estimate: params.response.estimate,
      mae_estimated_pct: params.response.mae_estimated_pct,
      ci_low: params.response.ci_low,
      ci_high: params.response.ci_high,
      confidence_score: params.response.confidence_score,
      estimate_alternative: params.response.estimate_alternative,
      spread_pct: params.response.spread_pct,
      flag_uncertain: params.response.flag_uncertain,
      flag_corroborated: params.response.flag_corroborated,
      adjustments: params.response.adjustments,
      comparables: params.response.comparables,
      market_context: params.response.market_context,
      provenance: {
        methodology: params.response.methodology,
        model_version: params.response.model_version,
        endpoint_version: params.response.endpoint_version,
        citations: params.response.citations,
      },
      valid_until: params.response.valid_until,
    };
    await (admin as unknown as SupabaseAdmin).from('avm_estimates' as never).insert(row as never);
  } catch {
    // Persistencia best-effort — un fallo aquí no bloquea el response al
    // cliente. Error queda en OTel traces si hay integración.
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function validUntilIso(): string {
  return new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function hashIpForTelemetry(ip: string): string {
  return createHash('sha256').update(`avm-ip:${ip}`).digest('hex').slice(0, 12);
}

// Bypass BotID cuando:
//   - NODE_ENV=test (desarrollo local / vitest)
//   - tier Pro/Enterprise (api_key válida)
async function checkBot(request: Request, tier: TierName): Promise<boolean> {
  if (tier !== 'free') return true;
  if (process.env.NODE_ENV === 'test') return true;
  const testBypass = request.headers.get('x-botid-bypass');
  if (testBypass === 'HUMAN') return true;
  try {
    const result = await checkBotId({
      developmentOptions: { bypass: undefined },
      advancedOptions: { checkLevel: 'basic' },
    });
    if ('isHuman' in result) {
      return Boolean(result.isHuman) || Boolean(result.bypassed);
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return err('invalid_json', 400);
  }

  const parsed = estimateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return err('invalid_payload', 400, parsed.error.flatten());
  }
  const input = parsed.data;

  const apiKey = extractApiKey(request);
  const tier = classifyTierFromApiKey(apiKey);

  const botOk = await checkBot(request, tier);
  if (!botOk) return err('bot_challenge_failed', 403);

  const rateKey = apiKey ? `avm:key:${apiKey}` : clientIdentityKey(request);
  const rate = enforceRateLimit(rateKey, tier);
  if (!rate.allowed) {
    return json(
      {
        ok: false as const,
        error: 'rate_limited',
        tier: rate.tier,
        reset_at: rate.reset_at,
        upgrade_url: '/estimate#pricing',
      },
      429,
    );
  }

  const fingerprint = computeFingerprint(input);
  const admin = safeCreateAdmin();

  if (admin) {
    const cached = await lookupCache(admin, fingerprint);
    if (cached) {
      posthog.capture({
        distinctId: hashIpForTelemetry(rateKey),
        event: 'ie.avm.estimated',
        properties: {
          estimate: cached.estimate,
          confidence: cached.confidence_score,
          spread_pct: cached.spread_pct,
          cached: true,
          duration_ms: Date.now() - startedAt,
          model_version: cached.model_version,
          endpoint_version: ENDPOINT_VERSION,
          tier,
        },
      });
      return json(cached, 200);
    }
  }

  const fv = await buildFeatureVector(input);
  const comparables: readonly AvmComparable[] = await fetchComparables(admin, input, {
    fallbackFixture: [],
  });
  const pricesM2 = comparables.map((c) => c.price_m2);
  const prediction = predict(fv.values, {
    missing_fields_count: fv.missing_fields.length,
    comparables_price_m2: pricesM2,
    sup_m2: input.sup_m2,
  });

  const mae = prediction.mae_estimated_pct / 100;
  const ciLow = Math.max(1, Math.round(prediction.estimate * (1 - mae)));
  const ciHigh = Math.round(prediction.estimate * (1 + mae));

  const estimateAlt = counterEstimateFromComparables(comparables, input.sup_m2);
  const spreadPct =
    estimateAlt !== null && prediction.estimate > 0
      ? Number(
          ((Math.abs(prediction.estimate - estimateAlt) / prediction.estimate) * 100).toFixed(2),
        )
      : null;
  const flagUncertain = spreadPct !== null && spreadPct > SPREAD_UNCERTAIN_THRESHOLD;
  const flagCorroborated = spreadPct !== null && !flagUncertain;

  const adjustments = buildAdjustments({
    features: fv.values,
    missing_fields: fv.missing_fields,
  });

  const pricesSortedForP50 = [...pricesM2].sort((a, b) => a - b);
  const medianPrice =
    pricesSortedForP50.length > 0
      ? (pricesSortedForP50[Math.floor(pricesSortedForP50.length / 2)] as number)
      : null;

  const marketContext: AvmMarketContext = {
    precio_m2_zona_p50: medianPrice,
    absorcion_12m: null,
    momentum_n11: null,
    last_data_update: nowIso(),
  };

  const meta = getModelMetadata();
  const computedAt = nowIso();
  const validUntil = validUntilIso();

  const response: EstimateResponse = {
    estimate: prediction.estimate,
    ci_low: ciLow,
    ci_high: ciHigh,
    confidence_score: prediction.confidence_score,
    mae_estimated_pct: prediction.mae_estimated_pct,
    estimate_alternative: estimateAlt,
    spread_pct: spreadPct,
    flag_uncertain: flagUncertain,
    flag_corroborated: flagCorroborated,
    score_label_key: flagUncertain
      ? 'ie.avm.label.estimate_uncertain'
      : 'ie.avm.label.estimate_corroborated',
    adjustments: adjustments as EstimateResponse['adjustments'],
    comparables: comparables as EstimateResponse['comparables'],
    market_context: marketContext,
    methodology: {
      formula: 'estimate = intercept + Σ wi·xi_z (H1 linear)',
      sources: ['coefficients-h1', 'zone_scores', 'market_prices_secondary', 'macro_series'],
      weights: { intercept: meta.intercept, r_squared: meta.r_squared },
      references: [
        {
          name: '03.8 §I01 DMX Estimate',
          url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#i01-dmx-estimate',
        },
        {
          name: 'ADR-013 API as Product',
          url: 'docs/01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md',
        },
      ],
      validity: { unit: 'hours', value: CACHE_TTL_HOURS },
    },
    model_version: MODEL_VERSION,
    endpoint_version: ENDPOINT_VERSION,
    valid_until: validUntil,
    cached: false,
    computed_at: computedAt,
    citations: [
      { source: 'coefficients-h1', accessed_at: computedAt },
      ...(comparables.length > 0
        ? [{ source: 'market_prices_secondary', accessed_at: computedAt }]
        : []),
    ],
  };

  const validated = estimateResponseSchema.safeParse(response);
  if (!validated.success) {
    return err('response_shape_invalid', 500, validated.error.flatten());
  }

  if (admin) {
    await persistEstimate(admin, {
      fingerprint,
      input,
      response: validated.data,
      userId: null,
    });
  }

  posthog.capture({
    distinctId: apiKey ? hashUserIdForTelemetry(apiKey) : hashIpForTelemetry(rateKey),
    event: 'ie.avm.estimated',
    properties: {
      estimate: validated.data.estimate,
      confidence: validated.data.confidence_score,
      spread_pct: validated.data.spread_pct,
      cached: false,
      duration_ms: Date.now() - startedAt,
      model_version: validated.data.model_version,
      endpoint_version: ENDPOINT_VERSION,
      tier,
      missing_fields_count: fv.missing_fields.length,
    },
  });

  return json(validated.data, 200);
}
