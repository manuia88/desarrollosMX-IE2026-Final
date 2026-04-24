#!/usr/bin/env node
/**
 * Batch compute colonia_wiki_entries via Anthropic Haiku 4.5 (SESIÓN 07.5.E).
 *
 * Genera entradas wiki tipo atlas vivo para cada colonia MX registrada en
 * public.zones (scope_type='colonia') usando LLM estructurado con 8 secciones:
 *   overview · demographics · climate · pulse_trend · ghost_status · twin_cities
 *   · cultural_vibes · best_for
 *
 * Cada entry persiste:
 *   - content_md        — markdown concatenado (## headers por sección)
 *   - sections (jsonb)  — objeto estructurado + sections.meta (explainability U-E-2)
 *
 * Fuentes data consultadas por zona (11 tablas):
 *   zones, zone_scores, dmx_indices, zone_pulse_scores, pulse_forecasts,
 *   colonia_dna_vectors, ghost_zones_ranking, climate_zone_signatures,
 *   zone_constellations_edges, inegi_census_zone_stats, enigh_zone_income
 *
 * Prompt caching Anthropic (U-E-1):
 *   system = [ {text: WIKI_SYSTEM_PROMPT},
 *              {text: WIKI_SCHEMA_DEFINITION, cache_control: ephemeral},
 *              {text: WIKI_EXAMPLES_3,        cache_control: ephemeral} ]
 *   Primera call = cache_creation. Subsecuentes = cache_read 90% off.
 *
 * Uso:
 *   ANTHROPIC_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/13_compute-atlas-wiki-haiku.ts
 *
 * Flags:
 *   --dry-run              Genera 1 prompt + muestra projection cost, NO call, NO mutate.
 *   --limit=N              Procesa sólo N colonias (default 210).
 *   --locale=es-MX         Default es-MX (otros locales fuera scope).
 *   --model=ID             Default claude-haiku-4-5-20251001.
 *   --cost-cap-usd=3.00    Budget total; aborta loop si se excede.
 *   --country=MX           ISO country code (default MX).
 *   --skip-existing        Default TRUE — skip si entry (colonia_id, v=1) <7 días.
 *   --no-skip-existing     Desactiva skip idempotencia.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

// ========================================================================
// Constants
// ========================================================================

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT = 210;
const DEFAULT_LOCALE = 'es-MX';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_COST_CAP_USD = 3.0;
const MAX_LIMIT_CAP = 300;
const SOURCE = 'compute_atlas_wiki';
const METHODOLOGY_VERSION = 'v1.0';
const SCOPE_TYPE_COLONIA = 'colonia';
const REQUEST_SLEEP_MS = 500;
const RETRY_BACKOFF_MS = 2000;
const MAX_RETRIES = 1;
const SKIP_TTL_DAYS = 7;
const MAX_OUTPUT_TOKENS = 3000;

// Haiku 4.5 pricing (USD per 1M tokens).
export const HAIKU_PRICING = {
  input_uncached_per_m: 0.8,
  input_cache_read_per_m: 0.08,
  cache_creation_per_m: 1.0,
  output_per_m: 4.0,
} as const;

// ========================================================================
// CLI
// ========================================================================

type CliArgs = {
  dryRun: boolean;
  limit: number;
  locale: string;
  model: string;
  costCapUsd: number;
  country: string;
  skipExisting: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit = DEFAULT_LIMIT;
  let locale = DEFAULT_LOCALE;
  let model = DEFAULT_MODEL;
  let costCapUsd = DEFAULT_COST_CAP_USD;
  let country = DEFAULT_COUNTRY;
  let skipExisting = true;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--skip-existing') {
      skipExisting = true;
    } else if (a === '--no-skip-existing') {
      skipExisting = false;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-atlas-wiki-haiku] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--locale=')) {
      locale = a.slice('--locale='.length).trim();
      if (locale === '') {
        throw new Error(`[compute-atlas-wiki-haiku] --locale inválido: "${a}"`);
      }
    } else if (a.startsWith('--model=')) {
      model = a.slice('--model='.length).trim();
      if (model === '') {
        throw new Error(`[compute-atlas-wiki-haiku] --model inválido: "${a}"`);
      }
    } else if (a.startsWith('--cost-cap-usd=')) {
      const n = Number.parseFloat(a.slice('--cost-cap-usd='.length));
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-atlas-wiki-haiku] --cost-cap-usd inválido: "${a}"`);
      }
      costCapUsd = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-atlas-wiki-haiku] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  if (limit > MAX_LIMIT_CAP) {
    throw new Error(
      `[compute-atlas-wiki-haiku] --limit=${limit} excede cap=${MAX_LIMIT_CAP}. Ajustar o seed más colonias.`,
    );
  }
  return { dryRun, limit, locale, model, costCapUsd, country, skipExisting };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[compute-atlas-wiki-haiku] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

// ========================================================================
// Zod schemas (U-E-4 structured)
// ========================================================================

export const WikiSectionsSchema = z.object({
  overview: z.string().min(100).max(2000),
  demographics: z.string().min(80).max(1500),
  climate: z.string().min(50).max(1000),
  pulse_trend: z.string().min(50).max(1000),
  ghost_status: z.string().min(50).max(1000),
  twin_cities: z.string().min(50).max(1000),
  cultural_vibes: z.string().min(80).max(1500),
  best_for: z.string().min(80).max(1500),
});

export type WikiSections = z.infer<typeof WikiSectionsSchema>;

export const SECTION_ORDER: ReadonlyArray<keyof WikiSections> = [
  'overview',
  'demographics',
  'climate',
  'pulse_trend',
  'ghost_status',
  'twin_cities',
  'cultural_vibes',
  'best_for',
] as const;

export const SECTION_TITLES: Readonly<Record<keyof WikiSections, string>> = {
  overview: 'Overview',
  demographics: 'Demographics',
  climate: 'Climate',
  pulse_trend: 'Pulse Trend',
  ghost_status: 'Ghost Status',
  twin_cities: 'Twin Cities',
  cultural_vibes: 'Cultural Vibes',
  best_for: 'Best For',
} as const;

// ========================================================================
// Cost calculation (U-E-1 / U-E-2)
// ========================================================================

export type HaikuTokenUsage = {
  input_uncached: number;
  input_cached: number;
  cache_creation: number;
  output: number;
};

export function calculateCostUsd(usage: HaikuTokenUsage): number {
  const cost =
    (usage.input_uncached * HAIKU_PRICING.input_uncached_per_m) / 1_000_000 +
    (usage.cache_creation * HAIKU_PRICING.cache_creation_per_m) / 1_000_000 +
    (usage.input_cached * HAIKU_PRICING.input_cache_read_per_m) / 1_000_000 +
    (usage.output * HAIKU_PRICING.output_per_m) / 1_000_000;
  return cost;
}

// ========================================================================
// System prompt + schema definition + examples (cacheable blocks)
// ========================================================================

const WIKI_SYSTEM_PROMPT = [
  'Eres el redactor de DesarrollosMX Atlas Vivo, una enciclopedia de colonias mexicanas',
  'que combina datos estadísticos oficiales (INEGI, ENIGH) con señales propietarias',
  '(DMX indices, pulse scores, forecasts, DNA vectors, ghost score, climate signature,',
  'constellations topology).',
  '',
  'Tu tarea: dado el contexto JSON de UNA colonia, devolver un objeto JSON con 8',
  'secciones en español (locale es-MX), factual, concreto, sin marketing vacío.',
  '',
  'Reglas de contenido:',
  '1. Factual: cita valores numéricos específicos del contexto (DMX PRC=72, pulse=58, etc.).',
  '2. Honesto con gaps: si falta data para una sección, indica que no hay cobertura,',
  '   NO inventes números.',
  '3. Sin jerga: escribe para un lector general (founder, comprador, curioso).',
  '4. Conciso: respeta los límites mínimos/máximos por sección.',
  '5. Twin cities: menciona hasta 3 vecinos del grafo de constellation edges.',
  '6. Best_for: perfiles de usuarios recomendados (familia joven, inversor, renter, etc.).',
  '',
  'Respond ONLY with valid JSON matching the schema. No markdown code fences.',
  'No explanation. Start with { and end with }.',
].join('\n');

const WIKI_SCHEMA_DEFINITION = [
  'JSON Schema esperado:',
  '{',
  '  "overview": string 100-2000 chars — qué es la colonia, ubicación, personalidad',
  '  "demographics": string 80-1500 chars — población, edades, ingresos, profesiones',
  '  "climate": string 50-1000 chars — firma climática 12-dim (temp, precipitación estacional)',
  '  "pulse_trend": string 50-1000 chars — últimos 30d + forecast 30d',
  '  "ghost_status": string 50-1000 chars — ghost_score + transition_probability',
  '  "twin_cities": string 50-1000 chars — vecinos constellation top-3 por weight',
  '  "cultural_vibes": string 80-1500 chars — tono cultural derivado de DNA vector + indices',
  '  "best_for": string 80-1500 chars — perfiles de comprador/renter recomendados',
  '}',
].join('\n');

const WIKI_EXAMPLES_3 = [
  'Ejemplo de output válido (fragmento, NO copies literal):',
  '{',
  '  "overview": "Roma Norte es una colonia céntrica de la Ciudad de México...",',
  '  "demographics": "Población estimada 35,000 residentes, mediana 34 años...",',
  '  "climate": "Clima templado con estación lluviosa jun-sep...",',
  '  "pulse_trend": "Pulse 68/100 últimos 30 días, forecast estable...",',
  '  "ghost_status": "Ghost score 18/100, probabilidad transición 8% — zona viva",',
  '  "twin_cities": "Vecinos constellation: Condesa (0.91), Juárez (0.87), Hipódromo (0.82)",',
  '  "cultural_vibes": "Vibra cosmopolita, café specialty, galerías...",',
  '  "best_for": "Profesionales jóvenes, creativos, parejas sin hijos..."',
  '}',
  '',
  'Ejemplo 2 — colonia con data parcial (missing climate):',
  '{',
  '  "overview": "Tlalpan Centro combina pueblo conservador y tejido...",',
  '  "climate": "Sin cobertura climática completa para esta zona (missing signature).",',
  '  "twin_cities": "Vecinos disponibles: Coyoacán (0.79). Otros edges pendientes.",',
  '  ...',
  '}',
  '',
  'Ejemplo 3 — colonia ghost-prone (transition_probability alta):',
  '{',
  '  "ghost_status": "Ghost score 68/100, transition_probability 0.72 — señales',
  '                   de declive: pulse cae 12pts/12m, demografía envejecida 48% 45+...",',
  '  ...',
  '}',
].join('\n');

// ========================================================================
// Zone context fetcher
// ========================================================================

export type ZoneRowBasic = {
  id: string;
  scope_id: string;
  name_es: string;
  lat: number | null;
  lng: number | null;
  country_code: string;
};

export type ZoneContext = {
  zone: ZoneRowBasic;
  zone_scores: Array<{ score_type: string; score_value: number; period_date: string }>;
  dmx_indices: Array<{
    index_code: string;
    value: number;
    score_band: string | null;
    period_date: string;
  }>;
  pulse_history: Array<{ period_date: string; pulse_score: number | null }>;
  pulse_forecasts: Array<{ forecast_date: string; value: number }>;
  dna_vector_components: Json | null;
  ghost: {
    ghost_score: number;
    transition_probability: number | null;
    rank: number | null;
  } | null;
  climate: { signature: string; years_observed: number } | null;
  edges: Array<{ target_scope_id: string | null; edge_weight: number }>;
  census: {
    age_distribution: Json;
    dominant_profession: string | null;
    profession_distribution: Json;
  } | null;
  income: {
    median_salary_mxn: number | null;
    salary_range_distribution: Json;
  } | null;
  missing_sources: string[];
};

export async function buildZoneContext(
  supabase: SupabaseClient<Database>,
  zone: ZoneRowBasic,
): Promise<ZoneContext> {
  const missing: string[] = [];

  const [
    zoneScoresRes,
    dmxIndicesRes,
    pulseHistoryRes,
    pulseForecastsRes,
    dnaRes,
    ghostRes,
    climateRes,
    edgesRes,
    censusRes,
    incomeRes,
  ] = await Promise.all([
    supabase
      .from('zone_scores')
      .select('score_type, score_value, period_date')
      .eq('zone_id', zone.id)
      .eq('country_code', zone.country_code)
      .order('period_date', { ascending: false })
      .limit(3),
    supabase
      .from('dmx_indices')
      .select('index_code, value, score_band, period_date')
      .eq('scope_id', zone.scope_id)
      .eq('scope_type', SCOPE_TYPE_COLONIA)
      .eq('country_code', zone.country_code)
      .eq('is_shadow', false)
      .order('period_date', { ascending: false })
      .limit(10),
    supabase
      .from('zone_pulse_scores')
      .select('period_date, pulse_score')
      .eq('scope_id', zone.scope_id)
      .eq('scope_type', SCOPE_TYPE_COLONIA)
      .eq('country_code', zone.country_code)
      .order('period_date', { ascending: false })
      .limit(30),
    supabase
      .from('pulse_forecasts')
      .select('forecast_date, value')
      .eq('zone_id', zone.id)
      .eq('country_code', zone.country_code)
      .order('forecast_date', { ascending: true })
      .limit(30),
    supabase
      .from('colonia_dna_vectors')
      .select('components')
      .eq('colonia_id', zone.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ghost_zones_ranking')
      .select('ghost_score, transition_probability, rank')
      .eq('colonia_id', zone.id)
      .order('period_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('climate_zone_signatures')
      .select('signature, years_observed')
      .eq('zone_id', zone.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('zone_constellations_edges')
      .select('target_colonia_id, edge_weight')
      .eq('source_colonia_id', zone.id)
      .order('edge_weight', { ascending: false })
      .limit(5),
    supabase
      .from('inegi_census_zone_stats')
      .select('age_distribution, dominant_profession, profession_distribution')
      .eq('zone_id', zone.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('enigh_zone_income')
      .select('median_salary_mxn, salary_range_distribution')
      .eq('zone_id', zone.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const zone_scores = zoneScoresRes.data ?? [];
  if (zone_scores.length === 0) missing.push('zone_scores');

  const dmx_indices = dmxIndicesRes.data ?? [];
  if (dmx_indices.length === 0) missing.push('dmx_indices');

  const pulse_history = pulseHistoryRes.data ?? [];
  if (pulse_history.length === 0) missing.push('zone_pulse_scores');

  const pulse_forecasts = pulseForecastsRes.data ?? [];
  if (pulse_forecasts.length === 0) missing.push('pulse_forecasts');

  const dna_vector_components = dnaRes.data != null ? (dnaRes.data.components ?? null) : null;
  if (dna_vector_components == null) missing.push('colonia_dna_vectors');

  const ghost = ghostRes.data ?? null;
  if (ghost == null) missing.push('ghost_zones_ranking');

  const climate = climateRes.data ?? null;
  if (climate == null) missing.push('climate_zone_signatures');

  const edgesRaw = edgesRes.data ?? [];
  if (edgesRaw.length === 0) missing.push('zone_constellations_edges');
  // Map edges — we don't have scope_id of target pre-joined; carry ID as placeholder.
  const edges = edgesRaw.map((e) => ({
    target_scope_id: (e as { target_colonia_id: string | null }).target_colonia_id ?? null,
    edge_weight: e.edge_weight,
  }));

  const census = censusRes.data ?? null;
  if (census == null) missing.push('inegi_census_zone_stats');

  const income = incomeRes.data ?? null;
  if (income == null) missing.push('enigh_zone_income');

  return {
    zone,
    zone_scores,
    dmx_indices,
    pulse_history,
    pulse_forecasts,
    dna_vector_components,
    ghost,
    climate,
    edges,
    census,
    income,
    missing_sources: missing,
  };
}

// ========================================================================
// Fact counting (explainability U-E-2)
// ========================================================================

export function countFactsCited(ctx: ZoneContext): number {
  let n = 0;
  n += ctx.zone_scores.length;
  n += ctx.dmx_indices.length;
  n += ctx.pulse_history.length > 0 ? 1 : 0;
  n += ctx.pulse_forecasts.length > 0 ? 1 : 0;
  n += ctx.dna_vector_components != null ? 1 : 0;
  n += ctx.ghost != null ? 1 : 0;
  n += ctx.climate != null ? 1 : 0;
  n += ctx.edges.length;
  n += ctx.census != null ? 1 : 0;
  n += ctx.income != null ? 1 : 0;
  return n;
}

// ========================================================================
// Haiku message builder (U-E-1 prompt caching)
// ========================================================================

export type HaikuSystemBlock =
  | { type: 'text'; text: string }
  | { type: 'text'; text: string; cache_control: { type: 'ephemeral' } };

export type HaikuMessages = {
  system: HaikuSystemBlock[];
  user: string;
};

export function buildHaikuMessages(ctx: ZoneContext): HaikuMessages {
  const system: HaikuSystemBlock[] = [
    { type: 'text', text: WIKI_SYSTEM_PROMPT },
    {
      type: 'text',
      text: WIKI_SCHEMA_DEFINITION,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: WIKI_EXAMPLES_3,
      cache_control: { type: 'ephemeral' },
    },
  ];

  const userPayload = {
    zone: {
      scope_id: ctx.zone.scope_id,
      name_es: ctx.zone.name_es,
      lat: ctx.zone.lat,
      lng: ctx.zone.lng,
    },
    zone_scores: ctx.zone_scores,
    dmx_indices: ctx.dmx_indices,
    pulse_last_30d: ctx.pulse_history,
    pulse_forecast_30d: ctx.pulse_forecasts,
    dna_vector_components: ctx.dna_vector_components,
    ghost: ctx.ghost,
    climate: ctx.climate,
    constellation_edges_top5: ctx.edges,
    census: ctx.census,
    income: ctx.income,
    missing_sources: ctx.missing_sources,
  };

  const user = [
    'Contexto de la colonia:',
    '```json',
    JSON.stringify(userPayload, null, 2),
    '```',
    '',
    'Devuelve SOLO el objeto JSON con las 8 secciones (overview, demographics, climate,',
    'pulse_trend, ghost_status, twin_cities, cultural_vibes, best_for). Sin code fences,',
    'sin explicación adicional. Empieza con { y termina con }.',
  ].join('\n');

  return { system, user };
}

// ========================================================================
// JSON parsing robust (strip-json-markdown fallback)
// ========================================================================

export function stripJsonMarkdown(raw: string): string {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ```.
  const fenceMatch = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenceMatch?.[1] != null) {
    s = fenceMatch[1].trim();
  }
  // If still not starting with {, find first { and last }.
  if (!s.startsWith('{')) {
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first >= 0 && last > first) {
      s = s.slice(first, last + 1);
    }
  }
  return s;
}

export function parseWikiResponse(raw: string): WikiSections {
  const stripped = stripJsonMarkdown(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new Error(
      `[compute-atlas-wiki-haiku] JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const result = WikiSectionsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[compute-atlas-wiki-haiku] Zod validation failed: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(' | ')}`,
    );
  }
  return result.data;
}

// ========================================================================
// Markdown assembly
// ========================================================================

export function assembleMarkdownContent(sections: WikiSections): string {
  const parts: string[] = [];
  for (const key of SECTION_ORDER) {
    const title = SECTION_TITLES[key];
    const body = sections[key];
    parts.push(`## ${title}\n\n${body}`);
  }
  return parts.join('\n\n');
}

// ========================================================================
// Haiku call (with retry)
// ========================================================================

type HaikuResponse = {
  content: ReadonlyArray<{ type: string; text?: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

type AnthropicLike = {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      system: HaikuSystemBlock[];
      messages: Array<{ role: 'user'; content: string }>;
    }) => Promise<HaikuResponse>;
  };
};

export function extractResponseText(response: HaikuResponse): string {
  for (const block of response.content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      return block.text;
    }
  }
  throw new Error('[compute-atlas-wiki-haiku] response missing text block');
}

export function extractTokenUsage(response: HaikuResponse): HaikuTokenUsage {
  const cache_creation = response.usage.cache_creation_input_tokens ?? 0;
  const cache_read = response.usage.cache_read_input_tokens ?? 0;
  const input_uncached = Math.max(0, response.usage.input_tokens - cache_creation - cache_read);
  return {
    input_uncached,
    input_cached: cache_read,
    cache_creation,
    output: response.usage.output_tokens,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableStatus(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const obj = err as { status?: unknown };
  const status = obj.status;
  return status === 429 || status === 503;
}

export async function callHaiku(
  anthropic: AnthropicLike,
  model: string,
  messages: HaikuMessages,
): Promise<HaikuResponse> {
  let attempt = 0;
  for (;;) {
    try {
      return await anthropic.messages.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: messages.system,
        messages: [{ role: 'user', content: messages.user }],
      });
    } catch (err) {
      if (attempt < MAX_RETRIES && isRetriableStatus(err)) {
        attempt += 1;
        await sleep(RETRY_BACKOFF_MS);
        continue;
      }
      throw err;
    }
  }
}

// ========================================================================
// Supabase ops
// ========================================================================

export async function fetchColoniaZones(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneRowBasic[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, name_es, lat, lng, country_code')
    .eq('country_code', country)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-atlas-wiki-haiku] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRowBasic[];
}

type ExistingWikiRow = {
  id: string;
  sections: Json;
  edited_at: string;
};

export async function fetchExistingEntry(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
): Promise<ExistingWikiRow | null> {
  const { data, error } = await supabase
    .from('colonia_wiki_entries')
    .select('id, sections, edited_at')
    .eq('colonia_id', coloniaId)
    .eq('version', 1)
    .maybeSingle();
  if (error || data == null) return null;
  return data as ExistingWikiRow;
}

export function isFreshEntry(editedAt: string, ttlDays = SKIP_TTL_DAYS): boolean {
  const t = Date.parse(editedAt);
  if (!Number.isFinite(t)) return false;
  const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}

export type WikiMeta = {
  sources_consulted: string[];
  facts_cited: number;
  generation_seed: {
    model: string;
    temperature: number;
    timestamp: string;
    run_id: string;
  };
  token_usage: HaikuTokenUsage;
  cost_usd: number;
  missing_sources: string[];
};

export function buildMeta(opts: {
  ctx: ZoneContext;
  model: string;
  runId: string;
  usage: HaikuTokenUsage;
  costUsd: number;
}): WikiMeta {
  const allSources = [
    'zones',
    'zone_scores',
    'dmx_indices',
    'zone_pulse_scores',
    'pulse_forecasts',
    'colonia_dna_vectors',
    'ghost_zones_ranking',
    'climate_zone_signatures',
    'zone_constellations_edges',
    'inegi_census_zone_stats',
    'enigh_zone_income',
  ];
  const consulted = allSources.filter((s) => !opts.ctx.missing_sources.includes(s));
  return {
    sources_consulted: consulted,
    facts_cited: countFactsCited(opts.ctx),
    generation_seed: {
      model: opts.model,
      temperature: 0,
      timestamp: new Date().toISOString(),
      run_id: opts.runId,
    },
    token_usage: opts.usage,
    cost_usd: Number(opts.costUsd.toFixed(6)),
    missing_sources: opts.ctx.missing_sources,
  };
}

type WikiInsert = Database['public']['Tables']['colonia_wiki_entries']['Insert'];

export async function upsertWikiEntry(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
  contentMd: string,
  sections: WikiSections,
  meta: WikiMeta,
): Promise<void> {
  const sectionsJson = {
    ...sections,
    meta,
  } as unknown as Json;
  const row: WikiInsert = {
    colonia_id: coloniaId,
    version: 1,
    content_md: contentMd,
    sections: sectionsJson,
    edited_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('colonia_wiki_entries')
    .upsert(row, { onConflict: 'colonia_id,version' });
  if (error) {
    throw new Error(`[compute-atlas-wiki-haiku] upsert failed: ${error.message}`);
  }
}

// ========================================================================
// Main pipeline
// ========================================================================

type ProcessCounts = {
  processed: number;
  skipped: number;
  dlq: number;
  totalCostUsd: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalInputTokens: number;
};

async function processOneZone(opts: {
  supabase: SupabaseClient<Database>;
  anthropic: AnthropicLike;
  model: string;
  zone: ZoneRowBasic;
  runId: string;
  index: number;
  total: number;
  tag: string;
}): Promise<{ status: 'ok' | 'dlq'; usage: HaikuTokenUsage; costUsd: number }> {
  const { supabase, anthropic, model, zone, runId, index, total, tag } = opts;
  console.log(`${tag} processing zone scope_id=${zone.scope_id} (${index + 1}/${total})`);

  let ctx: ZoneContext;
  try {
    ctx = await buildZoneContext(supabase, zone);
  } catch (err) {
    console.error(
      `${tag} context fetch fail scope_id=${zone.scope_id}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {
      status: 'dlq',
      usage: { input_uncached: 0, input_cached: 0, cache_creation: 0, output: 0 },
      costUsd: 0,
    };
  }

  console.log(
    `${tag} fetched context: zones=1 scores=${ctx.zone_scores.length} indices=${ctx.dmx_indices.length} pulse=${ctx.pulse_history.length} forecasts=${ctx.pulse_forecasts.length} dna=${ctx.dna_vector_components != null ? 1 : 0} ghost=${ctx.ghost != null ? 1 : 0} climate=${ctx.climate != null ? 1 : 0} edges=${ctx.edges.length} census=${ctx.census != null ? 1 : 0} income=${ctx.income != null ? 1 : 0} (missing=[${ctx.missing_sources.join(',')}])`,
  );

  const messages = buildHaikuMessages(ctx);
  let response: HaikuResponse;
  try {
    response = await callHaiku(anthropic, model, messages);
  } catch (err) {
    console.error(
      `${tag} haiku call fail scope_id=${zone.scope_id}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {
      status: 'dlq',
      usage: { input_uncached: 0, input_cached: 0, cache_creation: 0, output: 0 },
      costUsd: 0,
    };
  }

  const usage = extractTokenUsage(response);
  const costUsd = calculateCostUsd(usage);

  let sections: WikiSections;
  try {
    const text = extractResponseText(response);
    sections = parseWikiResponse(text);
  } catch (err) {
    console.error(
      `${tag} parse fail scope_id=${zone.scope_id}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { status: 'dlq', usage, costUsd };
  }

  const contentMd = assembleMarkdownContent(sections);
  const meta = buildMeta({ ctx, model, runId, usage, costUsd });

  try {
    await upsertWikiEntry(supabase, zone.id, contentMd, sections, meta);
  } catch (err) {
    console.error(
      `${tag} upsert fail scope_id=${zone.scope_id}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { status: 'dlq', usage, costUsd };
  }

  console.log(
    `${tag} haiku call: in_cached=${usage.input_cached} in_uncached=${usage.input_uncached} cache_created=${usage.cache_creation} out=${usage.output} cost=$${costUsd.toFixed(4)}`,
  );
  console.log(`${tag} upserted entry colonia_id=${zone.id} version=1`);
  return { status: 'ok', usage, costUsd };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-atlas-wiki-haiku]';
  console.log(
    `${tag} dryRun=${args.dryRun} country=${args.country} limit=${args.limit} locale=${args.locale} model=${args.model} cost_cap=$${args.costCapUsd} skip_existing=${args.skipExisting}`,
  );

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchColoniaZones(supabase, args.country, args.limit);
  console.log(`${tag} colonias_matched=${zones.length}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay colonias para country=${args.country}. Exit clean.`);
    return 0;
  }

  if (args.dryRun) {
    const first = zones[0];
    if (first == null) {
      console.log(`${tag} DRY RUN — no zones to preview`);
      return 0;
    }
    const ctx = await buildZoneContext(supabase, first);
    const messages = buildHaikuMessages(ctx);
    const approxSystemChars =
      messages.system.reduce((n, b) => n + b.text.length, 0) + messages.user.length;
    const approxInputTokens = Math.ceil(approxSystemChars / 4);
    const approxOutputTokens = 1500;
    const approxCostPerCall =
      (approxInputTokens * HAIKU_PRICING.input_uncached_per_m) / 1_000_000 +
      (approxOutputTokens * HAIKU_PRICING.output_per_m) / 1_000_000;
    const approxCachedPerCall =
      (Math.floor(approxInputTokens * 0.75) * HAIKU_PRICING.input_cache_read_per_m) / 1_000_000 +
      (Math.floor(approxInputTokens * 0.25) * HAIKU_PRICING.input_uncached_per_m) / 1_000_000 +
      (approxOutputTokens * HAIKU_PRICING.output_per_m) / 1_000_000;
    console.log(
      `${tag} DRY sample zone=${first.scope_id} approx_input_tokens=${approxInputTokens} approx_output_tokens=${approxOutputTokens}`,
    );
    console.log(
      `${tag} DRY projection: first_call=$${approxCostPerCall.toFixed(4)} cached_call=$${approxCachedPerCall.toFixed(4)} total_${zones.length}_zones=$${(approxCostPerCall + approxCachedPerCall * (zones.length - 1)).toFixed(4)}`,
    );
    console.log(`${tag} DRY RUN — no Anthropic call, no DB mutation`);
    return 0;
  }

  const anthropicApiKey = requireEnv('ANTHROPIC_API_KEY');
  const anthropic: AnthropicLike = new Anthropic({
    apiKey: anthropicApiKey,
  }) as unknown as AnthropicLike;

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-atlas-wiki-haiku',
      expectedPeriodicity: 'monthly',
      meta: {
        script: '13_compute-atlas-wiki-haiku.ts',
        colonias_total: zones.length,
        model: args.model,
        locale: args.locale,
        cost_cap_usd: args.costCapUsd,
        methodology_version: METHODOLOGY_VERSION,
      },
    },
    async ({ runId }) => {
      const counts: ProcessCounts = {
        processed: 0,
        skipped: 0,
        dlq: 0,
        totalCostUsd: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalInputTokens: 0,
      };
      let budgetExceeded = false;

      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        if (zone == null) continue;

        if (counts.totalCostUsd >= args.costCapUsd) {
          console.error(
            `${tag} BUDGET_EXCEEDED: $${counts.totalCostUsd.toFixed(4)} >= $${args.costCapUsd} — aborting loop`,
          );
          budgetExceeded = true;
          break;
        }

        if (args.skipExisting) {
          const existing = await fetchExistingEntry(supabase, zone.id);
          if (existing != null && isFreshEntry(existing.edited_at)) {
            console.log(
              `${tag} skip scope_id=${zone.scope_id} (entry <${SKIP_TTL_DAYS}d, edited_at=${existing.edited_at})`,
            );
            counts.skipped += 1;
            continue;
          }
        }

        const res = await processOneZone({
          supabase,
          anthropic,
          model: args.model,
          zone,
          runId,
          index: i,
          total: zones.length,
          tag,
        });

        counts.totalCostUsd += res.costUsd;
        counts.cacheReadTokens += res.usage.input_cached;
        counts.cacheCreationTokens += res.usage.cache_creation;
        counts.totalInputTokens +=
          res.usage.input_cached + res.usage.cache_creation + res.usage.input_uncached;

        if (res.status === 'ok') {
          counts.processed += 1;
          console.log(
            `${tag} cumulative cost=$${counts.totalCostUsd.toFixed(4)}/$${args.costCapUsd}`,
          );
        } else {
          counts.dlq += 1;
        }

        if (i < zones.length - 1) {
          await sleep(REQUEST_SLEEP_MS);
        }
      }

      const cacheHitRate =
        counts.totalInputTokens > 0 ? (counts.cacheReadTokens / counts.totalInputTokens) * 100 : 0;
      console.log(
        `${tag} summary: processed=${counts.processed} skipped=${counts.skipped} dlq=${counts.dlq} total_cost=$${counts.totalCostUsd.toFixed(4)} cache_hit_rate=${cacheHitRate.toFixed(1)}%`,
      );

      // Persist total cost estimated on ingest_runs (best-effort).
      const costUpdate = await supabase
        .from('ingest_runs')
        .update({ cost_estimated_usd: Number(counts.totalCostUsd.toFixed(6)) })
        .eq('id', runId);
      if (costUpdate.error) {
        console.error(
          `${tag} WARNING: no se pudo actualizar ingest_runs.cost_estimated_usd: ${costUpdate.error.message}`,
        );
      }

      if (budgetExceeded) {
        // Signal partial status via error message; withIngestRun will mark 'failed'.
        // Instead, throw specific error only if NOTHING processed.
        if (counts.processed === 0) {
          throw new Error(`BUDGET_EXCEEDED_ZERO_PROGRESS`);
        }
      }

      return {
        counts: {
          inserted: 0,
          updated: counts.processed,
          skipped: counts.skipped,
          dlq: counts.dlq,
        },
        lastSuccessfulPeriodEnd: new Date().toISOString().slice(0, 10),
      };
    },
  );

  console.log(
    `${tag} done: status=${result.status} counts=${JSON.stringify(result.counts)} duration_ms=${result.durationMs}`,
  );
  return result.status === 'success' ? 0 : 1;
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[compute-atlas-wiki-haiku] FATAL:', err);
      process.exit(1);
    });
}
