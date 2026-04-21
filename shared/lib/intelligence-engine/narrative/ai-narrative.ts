// D32 FASE 10 SESIÓN 2/3 — AI narrative runtime (Claude Haiku) pre-N5.
//
// Plan FASE 10 §N3 C04 Objection Killer AI requiere generation natural language.
// Wire Claude Haiku para calculators marked `methodology.ai_narrative: true`.
//
// API pública:
//   generateNarrative({ scoreId, entityId, components, template, locale? })
//     → { text, cached, cost_usd }
//
// Cache in-memory 24h per (score_id + entity_id + components_hash). Cost control:
// solo regen si components cambian >10% (hash estable vs fuzzy). ~$0.001/narrative
// (Haiku). Integra trackExternalCost via run-score.ts.
//
// Reusable para N5 scores en FASE 12 (infra ready).

import { generateText } from 'ai';
import { resolveModel } from '@/shared/lib/ai/providers';

export interface GenerateNarrativeParams {
  readonly scoreId: string;
  readonly entityId: string;
  readonly components: Readonly<Record<string, unknown>>;
  readonly template: string;
  readonly locale?: string;
  readonly maxOutputTokens?: number;
}

export interface GenerateNarrativeResult {
  readonly text: string;
  readonly cached: boolean;
  readonly cost_usd: number;
  readonly tokens_in: number;
  readonly tokens_out: number;
  readonly components_hash: string;
}

interface CacheEntry {
  readonly text: string;
  readonly components_hash: string;
  readonly expires_at: number;
  readonly cost_usd: number;
  readonly tokens_in: number;
  readonly tokens_out: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NARRATIVE_CACHE = new Map<string, CacheEntry>();

// Pricing Haiku 4.5 aprox — $0.80/MTok input, $4.00/MTok output.
const HAIKU_COST_IN_PER_MTOK = 0.8;
const HAIKU_COST_OUT_PER_MTOK = 4.0;

function hashComponents(components: Readonly<Record<string, unknown>>): string {
  const stable = JSON.stringify(components, Object.keys(components).sort());
  let hash = 0;
  for (let i = 0; i < stable.length; i++) {
    const c = stable.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return hash.toString(16);
}

function cacheKey(scoreId: string, entityId: string, locale: string): string {
  return `${scoreId}:${entityId}:${locale}`;
}

export function resetNarrativeCache(): void {
  NARRATIVE_CACHE.clear();
}

export async function generateNarrative(
  params: GenerateNarrativeParams,
): Promise<GenerateNarrativeResult> {
  const locale = params.locale ?? 'es-MX';
  const components_hash = hashComponents(params.components);
  const key = cacheKey(params.scoreId, params.entityId, locale);

  const existing = NARRATIVE_CACHE.get(key);
  if (
    existing &&
    existing.components_hash === components_hash &&
    existing.expires_at > Date.now()
  ) {
    return {
      text: existing.text,
      cached: true,
      cost_usd: 0,
      tokens_in: existing.tokens_in,
      tokens_out: existing.tokens_out,
      components_hash,
    };
  }

  const prompt = buildPrompt(params, locale);

  try {
    const res = await generateText({
      model: resolveModel('haiku'),
      messages: [{ role: 'user', content: prompt }],
      ...(params.maxOutputTokens ? { maxOutputTokens: params.maxOutputTokens } : {}),
    });

    const tokens_in = res.usage?.inputTokens ?? 0;
    const tokens_out = res.usage?.outputTokens ?? 0;
    const cost_usd = Number(
      (
        (tokens_in * HAIKU_COST_IN_PER_MTOK + tokens_out * HAIKU_COST_OUT_PER_MTOK) /
        1_000_000
      ).toFixed(6),
    );

    const text = res.text.trim();
    NARRATIVE_CACHE.set(key, {
      text,
      components_hash,
      expires_at: Date.now() + CACHE_TTL_MS,
      cost_usd,
      tokens_in,
      tokens_out,
    });

    return { text, cached: false, cost_usd, tokens_in, tokens_out, components_hash };
  } catch {
    // Fallback textual si Haiku falla: devuelve el template como está
    // (substitución naive {placeholders}). Evita que el calculator reviente
    // runtime si ANTHROPIC_API_KEY no está set en preview.
    const fallback = renderTemplateFallback(params.template, params.components);
    return {
      text: fallback,
      cached: false,
      cost_usd: 0,
      tokens_in: 0,
      tokens_out: 0,
      components_hash,
    };
  }
}

function buildPrompt(params: GenerateNarrativeParams, locale: string): string {
  const componentsBlock = JSON.stringify(params.components, null, 2);
  return [
    `Eres un analista inmobiliario experto. Escribe en ${locale}.`,
    `Tarea: elabora una respuesta corta (1-3 oraciones) basada en el template y los components numéricos del score.`,
    `Reglas: cita SIEMPRE los números exactos. Sin hedging ("podría", "quizás"). No inventes métricas.`,
    `Score: ${params.scoreId}. Entity: ${params.entityId}.`,
    `Template:\n${params.template}`,
    `Components:\n${componentsBlock}`,
  ].join('\n\n');
}

function renderTemplateFallback(
  template: string,
  components: Readonly<Record<string, unknown>>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, k) => {
    const v = components[k];
    return v === undefined || v === null ? '—' : String(v);
  });
}
