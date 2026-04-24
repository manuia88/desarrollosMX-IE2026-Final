import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';
import {
  assembleMarkdownContent,
  buildHaikuMessages,
  buildMeta,
  buildZoneContext,
  calculateCostUsd,
  callHaiku,
  countFactsCited,
  extractResponseText,
  extractTokenUsage,
  HAIKU_PRICING,
  isFreshEntry,
  parseWikiResponse,
  SECTION_ORDER,
  SECTION_TITLES,
  stripJsonMarkdown,
  type WikiSections,
  WikiSectionsSchema,
  type ZoneContext,
  type ZoneRowBasic,
} from '../13_compute-atlas-wiki-haiku.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

// ========================================================================
// Helpers
// ========================================================================

function makeValidSections(): WikiSections {
  return {
    overview:
      'Roma Norte es una colonia céntrica de la Ciudad de México con tejido urbano compacto, densidad media y fuerte presencia de café specialty, galerías y gastronomía contemporánea. Su ubicación entre Cuauhtémoc y Condesa la posiciona como nodo creativo principal.',
    demographics:
      'Población estimada 35,000 residentes, mediana 34 años, profesión dominante creativos/tech, ingreso medio arriba del promedio CDMX.',
    climate:
      'Clima templado sub-húmedo. Temperatura media anual 16C. Estación lluviosa junio-septiembre con precipitación 800mm.',
    pulse_trend:
      'Pulse 68/100 últimos 30 días. Forecast H+30d estable con banda de confianza estrecha indicando baja volatilidad reciente.',
    ghost_status:
      'Ghost score 18/100, transition_probability 8% — zona viva con tejido económico diverso y rotación saludable de negocios.',
    twin_cities:
      'Vecinos constellation top: Condesa (edge 0.91), Juárez (edge 0.87), Hipódromo (edge 0.82) — cluster creativo de CDMX.',
    cultural_vibes:
      'Vibra cosmopolita, cafés third-wave, galerías independientes, librerías, fotografía analógica, vida nocturna sin ser ruidosa. Arquitectura art deco bien conservada.',
    best_for:
      'Profesionales jóvenes, creativos, freelancers, parejas sin hijos, expatriados mid-career que buscan walkability y densidad cultural.',
  };
}

function makeZoneRow(): ZoneRowBasic {
  return {
    id: 'zone-uuid-1',
    scope_id: 'roma-norte',
    name_es: 'Roma Norte',
    lat: 19.4163,
    lng: -99.1617,
    country_code: 'MX',
  };
}

function makeEmptyZoneContext(): ZoneContext {
  return {
    zone: makeZoneRow(),
    zone_scores: [],
    dmx_indices: [],
    pulse_history: [],
    pulse_forecasts: [],
    dna_vector_components: null,
    ghost: null,
    climate: null,
    edges: [],
    census: null,
    income: null,
    missing_sources: [
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
    ],
  };
}

function makeFullZoneContext(): ZoneContext {
  return {
    zone: makeZoneRow(),
    zone_scores: [
      { score_type: 'F01', score_value: 72, period_date: '2026-04-01' },
      { score_type: 'F02', score_value: 68, period_date: '2026-04-01' },
      { score_type: 'F03', score_value: 71, period_date: '2026-04-01' },
    ],
    dmx_indices: Array.from({ length: 10 }, (_, i) => ({
      index_code: ['PRC', 'STA', 'ACC', 'SOC', 'ENE', 'FEE', 'CAR', 'ECO', 'GBG', 'PCL'][i] ?? 'X',
      value: 50 + i,
      score_band: 'medium',
      period_date: '2026-04-01',
    })),
    pulse_history: Array.from({ length: 30 }, (_, i) => ({
      period_date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      pulse_score: 60 + (i % 5),
    })),
    pulse_forecasts: Array.from({ length: 30 }, (_, i) => ({
      forecast_date: `2026-04-${String(i + 1).padStart(2, '0')}`,
      value: 62,
    })),
    dna_vector_components: { cultural: 0.8, economic: 0.7 },
    ghost: { ghost_score: 18, transition_probability: 0.08, rank: 180 },
    climate: { signature: '[1,2,3,4,5,6,7,8,9,10,11,12]', years_observed: 15 },
    edges: [
      { target_scope_id: 'condesa', edge_weight: 0.91 },
      { target_scope_id: 'juarez', edge_weight: 0.87 },
    ],
    census: {
      age_distribution: [{ age_group: '30-44', percentage: 30 }],
      dominant_profession: 'creative',
      profession_distribution: {},
    },
    income: { median_salary_mxn: 25000, salary_range_distribution: {} },
    missing_sources: [],
  };
}

function makeHaikuResponse(params: {
  text: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation?: number;
  cache_read?: number;
}) {
  return {
    content: [{ type: 'text', text: params.text }],
    usage: {
      input_tokens: params.input_tokens ?? 1000,
      output_tokens: params.output_tokens ?? 500,
      cache_creation_input_tokens: params.cache_creation ?? 0,
      cache_read_input_tokens: params.cache_read ?? 0,
    },
  };
}

// ========================================================================
// Zod schema validation
// ========================================================================

describe('WikiSectionsSchema', () => {
  it('accepts a valid object with all 8 sections', () => {
    const parsed = WikiSectionsSchema.safeParse(makeValidSections());
    expect(parsed.success).toBe(true);
  });

  it('rejects when a section is missing', () => {
    const partial = makeValidSections() as unknown as Record<string, unknown>;
    delete partial.best_for;
    const parsed = WikiSectionsSchema.safeParse(partial);
    expect(parsed.success).toBe(false);
  });

  it('rejects when a section is below minimum length', () => {
    const sections = makeValidSections();
    const bad = { ...sections, overview: 'short' };
    const parsed = WikiSectionsSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it('rejects when a section exceeds maximum length', () => {
    const sections = makeValidSections();
    const bad = { ...sections, overview: 'x'.repeat(2500) };
    const parsed = WikiSectionsSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it('rejects non-string types in sections', () => {
    const sections = makeValidSections() as unknown as Record<string, unknown>;
    sections.overview = 42;
    const parsed = WikiSectionsSchema.safeParse(sections);
    expect(parsed.success).toBe(false);
  });
});

// ========================================================================
// Cost calculation
// ========================================================================

describe('calculateCostUsd', () => {
  it('zero tokens → 0 USD', () => {
    expect(
      calculateCostUsd({ input_uncached: 0, input_cached: 0, cache_creation: 0, output: 0 }),
    ).toBe(0);
  });

  it('computes input uncached correctly', () => {
    // 1M uncached input @ $0.80
    const cost = calculateCostUsd({
      input_uncached: 1_000_000,
      input_cached: 0,
      cache_creation: 0,
      output: 0,
    });
    expect(cost).toBeCloseTo(0.8, 9);
  });

  it('computes cache_read correctly (90% discount)', () => {
    const cost = calculateCostUsd({
      input_uncached: 0,
      input_cached: 1_000_000,
      cache_creation: 0,
      output: 0,
    });
    expect(cost).toBeCloseTo(0.08, 9);
  });

  it('computes cache_creation correctly (25% premium)', () => {
    const cost = calculateCostUsd({
      input_uncached: 0,
      input_cached: 0,
      cache_creation: 1_000_000,
      output: 0,
    });
    expect(cost).toBeCloseTo(1.0, 9);
  });

  it('computes output correctly', () => {
    const cost = calculateCostUsd({
      input_uncached: 0,
      input_cached: 0,
      cache_creation: 0,
      output: 1_000_000,
    });
    expect(cost).toBeCloseTo(4.0, 9);
  });

  it('breaks down mixed usage correctly', () => {
    // 500 uncached + 1500 cached + 200 output.
    // 500*0.8/1M + 1500*0.08/1M + 200*4/1M = 0.0004 + 0.00012 + 0.0008 = 0.00132
    const cost = calculateCostUsd({
      input_uncached: 500,
      input_cached: 1500,
      cache_creation: 0,
      output: 200,
    });
    expect(cost).toBeCloseTo(0.00132, 9);
  });

  it('HAIKU_PRICING matches expected Haiku 4.5 rates', () => {
    expect(HAIKU_PRICING.input_uncached_per_m).toBe(0.8);
    expect(HAIKU_PRICING.input_cache_read_per_m).toBe(0.08);
    expect(HAIKU_PRICING.cache_creation_per_m).toBe(1.0);
    expect(HAIKU_PRICING.output_per_m).toBe(4.0);
  });
});

// ========================================================================
// Prompt caching structure (U-E-1)
// ========================================================================

describe('buildHaikuMessages — prompt caching structure', () => {
  it('returns system array with 3 blocks', () => {
    const msg = buildHaikuMessages(makeFullZoneContext());
    expect(msg.system).toHaveLength(3);
  });

  it('first system block has NO cache_control (variable)', () => {
    const msg = buildHaikuMessages(makeFullZoneContext());
    const first = msg.system[0];
    expect(first).toBeDefined();
    expect('cache_control' in (first ?? {})).toBe(false);
  });

  it('last two system blocks have cache_control ephemeral', () => {
    const msg = buildHaikuMessages(makeFullZoneContext());
    const second = msg.system[1];
    const third = msg.system[2];
    expect(second).toBeDefined();
    expect(third).toBeDefined();
    if (second != null && 'cache_control' in second) {
      expect(second.cache_control).toEqual({ type: 'ephemeral' });
    } else {
      throw new Error('second block missing cache_control');
    }
    if (third != null && 'cache_control' in third) {
      expect(third.cache_control).toEqual({ type: 'ephemeral' });
    } else {
      throw new Error('third block missing cache_control');
    }
  });

  it('respects Anthropic max 4 cache breakpoints (uses only 2)', () => {
    const msg = buildHaikuMessages(makeFullZoneContext());
    const withCache = msg.system.filter((b) => 'cache_control' in b);
    expect(withCache.length).toBeLessThanOrEqual(4);
    expect(withCache.length).toBe(2);
  });

  it('each cacheable block is non-empty text', () => {
    const msg = buildHaikuMessages(makeFullZoneContext());
    for (const block of msg.system) {
      expect(block.type).toBe('text');
      expect(block.text.length).toBeGreaterThan(0);
    }
  });

  it('user message includes zone scope_id and is non-empty', () => {
    const msg = buildHaikuMessages(makeFullZoneContext());
    expect(msg.user.length).toBeGreaterThan(0);
    expect(msg.user).toContain('roma-norte');
  });

  it('user message includes missing_sources for partial context', () => {
    const ctx = makeEmptyZoneContext();
    const msg = buildHaikuMessages(ctx);
    expect(msg.user).toContain('missing_sources');
    expect(msg.user).toContain('zone_scores');
  });
});

// ========================================================================
// JSON parsing robust (strip-json-markdown)
// ========================================================================

describe('stripJsonMarkdown', () => {
  it('passes through raw JSON unchanged', () => {
    const raw = '{"key":"value"}';
    expect(stripJsonMarkdown(raw)).toBe('{"key":"value"}');
  });

  it('strips ```json fences', () => {
    const raw = '```json\n{"key":"value"}\n```';
    expect(stripJsonMarkdown(raw)).toBe('{"key":"value"}');
  });

  it('strips bare ``` fences', () => {
    const raw = '```\n{"key":"value"}\n```';
    expect(stripJsonMarkdown(raw)).toBe('{"key":"value"}');
  });

  it('extracts JSON from surrounding prose', () => {
    const raw = 'Sure, here is the JSON:\n{"key":"value"}\nEnd of output.';
    expect(stripJsonMarkdown(raw)).toBe('{"key":"value"}');
  });

  it('trims whitespace', () => {
    const raw = '   \n{"key":"value"}\n   ';
    expect(stripJsonMarkdown(raw)).toBe('{"key":"value"}');
  });
});

describe('parseWikiResponse', () => {
  it('parses valid JSON with all 8 sections', () => {
    const raw = JSON.stringify(makeValidSections());
    const parsed = parseWikiResponse(raw);
    expect(parsed.overview.length).toBeGreaterThanOrEqual(100);
    expect(parsed.best_for.length).toBeGreaterThanOrEqual(80);
  });

  it('parses JSON wrapped in ```json fences', () => {
    const raw = `\`\`\`json\n${JSON.stringify(makeValidSections())}\n\`\`\``;
    const parsed = parseWikiResponse(raw);
    expect(parsed.overview.length).toBeGreaterThan(0);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseWikiResponse('not a json')).toThrow(/JSON parse failed/);
  });

  it('throws on schema mismatch (missing section)', () => {
    const partial = makeValidSections() as unknown as Record<string, unknown>;
    delete partial.twin_cities;
    expect(() => parseWikiResponse(JSON.stringify(partial))).toThrow(/Zod validation failed/);
  });
});

// ========================================================================
// Markdown assembly
// ========================================================================

describe('assembleMarkdownContent', () => {
  it('concatenates 8 sections with ## headers in correct order', () => {
    const md = assembleMarkdownContent(makeValidSections());
    const lines = md.split('\n');
    const headers = lines.filter((l) => l.startsWith('## '));
    expect(headers).toHaveLength(8);
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      const key = SECTION_ORDER[i];
      if (key == null) continue;
      expect(headers[i]).toBe(`## ${SECTION_TITLES[key]}`);
    }
  });

  it('includes the body text of each section', () => {
    const sections = makeValidSections();
    const md = assembleMarkdownContent(sections);
    expect(md).toContain(sections.overview);
    expect(md).toContain(sections.best_for);
  });

  it('separates sections with blank lines', () => {
    const md = assembleMarkdownContent(makeValidSections());
    // Each section header preceded by blank line (except the first).
    expect(md.split('## Demographics').length).toBe(2);
    expect(md).toMatch(/\n\n## Demographics/);
  });
});

// ========================================================================
// Token usage extraction
// ========================================================================

describe('extractTokenUsage', () => {
  it('extracts cache_creation + cache_read + derives uncached', () => {
    const resp = makeHaikuResponse({
      text: '{}',
      input_tokens: 2000,
      output_tokens: 500,
      cache_creation: 800,
      cache_read: 1000,
    });
    const usage = extractTokenUsage(resp);
    expect(usage.cache_creation).toBe(800);
    expect(usage.input_cached).toBe(1000);
    expect(usage.input_uncached).toBe(200);
    expect(usage.output).toBe(500);
  });

  it('handles missing cache fields (defaults 0)', () => {
    const resp = {
      content: [{ type: 'text', text: '{}' }],
      usage: { input_tokens: 500, output_tokens: 100 },
    };
    const usage = extractTokenUsage(resp);
    expect(usage.cache_creation).toBe(0);
    expect(usage.input_cached).toBe(0);
    expect(usage.input_uncached).toBe(500);
    expect(usage.output).toBe(100);
  });

  it('never returns negative input_uncached', () => {
    const resp = makeHaikuResponse({
      text: '{}',
      input_tokens: 100,
      output_tokens: 50,
      cache_creation: 500,
      cache_read: 500,
    });
    const usage = extractTokenUsage(resp);
    expect(usage.input_uncached).toBeGreaterThanOrEqual(0);
  });
});

describe('extractResponseText', () => {
  it('returns first text block', () => {
    const resp = makeHaikuResponse({ text: 'hello' });
    expect(extractResponseText(resp)).toBe('hello');
  });

  it('throws when no text block present', () => {
    const resp = {
      content: [],
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    expect(() => extractResponseText(resp)).toThrow(/response missing text block/);
  });
});

// ========================================================================
// Explainability meta (U-E-2)
// ========================================================================

describe('buildMeta — explainability structure', () => {
  it('includes all required keys', () => {
    const meta = buildMeta({
      ctx: makeFullZoneContext(),
      model: 'claude-haiku-4-5-20251001',
      runId: 'run-abc-123',
      usage: { input_uncached: 100, input_cached: 900, cache_creation: 0, output: 300 },
      costUsd: 0.0123,
    });
    expect(meta.sources_consulted).toBeDefined();
    expect(meta.facts_cited).toBeDefined();
    expect(meta.generation_seed).toBeDefined();
    expect(meta.token_usage).toBeDefined();
    expect(meta.cost_usd).toBeDefined();
    expect(meta.missing_sources).toBeDefined();
  });

  it('sources_consulted excludes missing_sources', () => {
    const ctx = makeFullZoneContext();
    ctx.missing_sources = ['climate_zone_signatures', 'pulse_forecasts'];
    const meta = buildMeta({
      ctx,
      model: 'claude-haiku-4-5-20251001',
      runId: 'r',
      usage: { input_uncached: 0, input_cached: 0, cache_creation: 0, output: 0 },
      costUsd: 0,
    });
    expect(meta.sources_consulted).not.toContain('climate_zone_signatures');
    expect(meta.sources_consulted).not.toContain('pulse_forecasts');
    expect(meta.sources_consulted).toContain('zones');
    expect(meta.missing_sources).toEqual(['climate_zone_signatures', 'pulse_forecasts']);
  });

  it('generation_seed contains model/timestamp/temperature/run_id', () => {
    const meta = buildMeta({
      ctx: makeFullZoneContext(),
      model: 'claude-haiku-4-5-20251001',
      runId: 'run-xyz',
      usage: { input_uncached: 1, input_cached: 2, cache_creation: 3, output: 4 },
      costUsd: 0.005,
    });
    expect(meta.generation_seed.model).toBe('claude-haiku-4-5-20251001');
    expect(meta.generation_seed.run_id).toBe('run-xyz');
    expect(meta.generation_seed.temperature).toBe(0);
    expect(typeof meta.generation_seed.timestamp).toBe('string');
    expect(Number.isFinite(Date.parse(meta.generation_seed.timestamp))).toBe(true);
  });

  it('token_usage mirrors input usage object', () => {
    const usage = { input_uncached: 50, input_cached: 150, cache_creation: 25, output: 100 };
    const meta = buildMeta({
      ctx: makeFullZoneContext(),
      model: 'm',
      runId: 'r',
      usage,
      costUsd: 0.001,
    });
    expect(meta.token_usage).toEqual(usage);
  });

  it('cost_usd rounded to 6 decimals', () => {
    const meta = buildMeta({
      ctx: makeFullZoneContext(),
      model: 'm',
      runId: 'r',
      usage: { input_uncached: 0, input_cached: 0, cache_creation: 0, output: 0 },
      costUsd: 0.0123456789,
    });
    expect(meta.cost_usd).toBe(0.012346);
  });

  it('facts_cited counts non-zero sources', () => {
    const ctx = makeFullZoneContext();
    const fact = countFactsCited(ctx);
    expect(fact).toBeGreaterThan(0);
  });

  it('facts_cited is 0 for empty context', () => {
    expect(countFactsCited(makeEmptyZoneContext())).toBe(0);
  });
});

// ========================================================================
// isFreshEntry
// ========================================================================

describe('isFreshEntry', () => {
  it('returns true for timestamp <7 days ago', () => {
    const editedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isFreshEntry(editedAt)).toBe(true);
  });

  it('returns false for timestamp >7 days ago', () => {
    const editedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isFreshEntry(editedAt)).toBe(false);
  });

  it('returns false for invalid timestamp', () => {
    expect(isFreshEntry('not-a-date')).toBe(false);
  });
});

// ========================================================================
// Anthropic SDK mock — happy path, retry, DLQ
// ========================================================================

describe('callHaiku — Anthropic SDK mock', () => {
  it('returns response on happy path (no retry)', async () => {
    const create = vi.fn(async () => makeHaikuResponse({ text: '{"ok":true}' }));
    const anthropic = { messages: { create } } as unknown as {
      messages: {
        create: typeof create;
      };
    };
    const messages = buildHaikuMessages(makeFullZoneContext());
    const resp = await callHaiku(anthropic, 'claude-haiku-4-5-20251001', messages);
    expect(create).toHaveBeenCalledTimes(1);
    expect(resp.content[0]?.text).toBe('{"ok":true}');
  });

  it('retries once on 429 error then succeeds', async () => {
    let calls = 0;
    const create = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('rate limited') as Error & { status?: number };
        err.status = 429;
        throw err;
      }
      return makeHaikuResponse({ text: '{"retried":true}' });
    });
    const anthropic = { messages: { create } } as unknown as {
      messages: {
        create: typeof create;
      };
    };
    const messages = buildHaikuMessages(makeFullZoneContext());
    const resp = await callHaiku(anthropic, 'claude-haiku-4-5-20251001', messages);
    expect(create).toHaveBeenCalledTimes(2);
    expect(resp.content[0]?.text).toBe('{"retried":true}');
  }, 10_000);

  it('retries once on 503 error then succeeds', async () => {
    let calls = 0;
    const create = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('service unavailable') as Error & { status?: number };
        err.status = 503;
        throw err;
      }
      return makeHaikuResponse({ text: '{"ok":1}' });
    });
    const anthropic = { messages: { create } } as unknown as {
      messages: {
        create: typeof create;
      };
    };
    const messages = buildHaikuMessages(makeFullZoneContext());
    const resp = await callHaiku(anthropic, 'claude-haiku-4-5-20251001', messages);
    expect(create).toHaveBeenCalledTimes(2);
    expect(resp.content[0]?.text).toBe('{"ok":1}');
  }, 10_000);

  it('fails (throws) after 2 consecutive 429 (max retries exhausted → DLQ)', async () => {
    const create = vi.fn(async () => {
      const err = new Error('still rate limited') as Error & { status?: number };
      err.status = 429;
      throw err;
    });
    const anthropic = { messages: { create } } as unknown as {
      messages: {
        create: typeof create;
      };
    };
    const messages = buildHaikuMessages(makeFullZoneContext());
    await expect(callHaiku(anthropic, 'claude-haiku-4-5-20251001', messages)).rejects.toThrow(
      /rate limited/,
    );
    expect(create).toHaveBeenCalledTimes(2); // 1 attempt + 1 retry.
  }, 10_000);

  it('does NOT retry on non-retriable error (e.g. 400)', async () => {
    const create = vi.fn(async () => {
      const err = new Error('bad request') as Error & { status?: number };
      err.status = 400;
      throw err;
    });
    const anthropic = { messages: { create } } as unknown as {
      messages: {
        create: typeof create;
      };
    };
    const messages = buildHaikuMessages(makeFullZoneContext());
    await expect(callHaiku(anthropic, 'claude-haiku-4-5-20251001', messages)).rejects.toThrow(
      /bad request/,
    );
    expect(create).toHaveBeenCalledTimes(1);
  });
});

// ========================================================================
// Budget cap simulation (pre-check)
// ========================================================================

describe('budget cap pre-check simulation', () => {
  it('loop aborts when accumulated cost >= cap', () => {
    // Simulate: $3 cap. After 2 calls, cost = $2.50. Third call would push to $4.00.
    const capUsd = 3.0;
    let totalCostUsd = 0;
    const callCosts = [1.0, 1.5, 1.5]; // cumulative: 1.0, 2.5, 4.0
    let processed = 0;

    for (const cost of callCosts) {
      if (totalCostUsd >= capUsd) {
        break;
      }
      totalCostUsd += cost;
      processed += 1;
    }

    // Processed 3 because the check is BEFORE the cost add on call #3: 2.5 < 3.
    expect(processed).toBe(3);
    expect(totalCostUsd).toBe(4.0);
  });

  it('stops processing once the cap is exceeded before a call', () => {
    const capUsd = 3.0;
    let totalCostUsd = 2.5; // already close.
    const callCosts = [0.6, 0.6, 0.6];
    let processed = 0;

    for (const cost of callCosts) {
      if (totalCostUsd >= capUsd) break;
      totalCostUsd += cost;
      processed += 1;
    }

    // After first call: 3.1 → next loop check aborts.
    expect(processed).toBe(1);
  });
});

// ========================================================================
// Integration: buildZoneContext with mocked Supabase
// ========================================================================

type MockResult = { data: unknown; error: unknown };
type MockTableMap = Record<string, MockResult>;

function createMockSupabase(byTable: MockTableMap): SupabaseClient<Database> {
  // Each `.from(table)` returns a chain whose terminal (thenable or maybeSingle)
  // resolves to the result configured for that table name.
  function buildChain(table: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;
    chain.select = passthrough;
    chain.eq = passthrough;
    chain.in = passthrough;
    chain.gte = passthrough;
    chain.lt = passthrough;
    chain.order = passthrough;
    chain.limit = passthrough;
    chain.maybeSingle = () => {
      const next = byTable[table] ?? { data: null, error: null };
      return Promise.resolve(next);
    };
    // biome-ignore lint/suspicious/noThenProperty: supabase query builder resolves via `then` on await; required for test mock.
    chain.then = (resolve: (v: MockResult) => unknown) => {
      const next = byTable[table] ?? { data: [], error: null };
      return Promise.resolve(resolve(next));
    };
    return chain;
  }

  const client = {
    from: (table: string) => buildChain(table),
  } as unknown as SupabaseClient<Database>;
  return client;
}

describe('buildZoneContext — supabase mock integration', () => {
  it('returns context with populated fields and empty missing_sources when all queries succeed', async () => {
    const byTable: MockTableMap = {
      zone_scores: {
        data: [{ score_type: 'F01', score_value: 70, period_date: '2026-04-01' }],
        error: null,
      },
      dmx_indices: {
        data: [{ index_code: 'PRC', value: 72, score_band: 'medium', period_date: '2026-04-01' }],
        error: null,
      },
      zone_pulse_scores: {
        data: [{ period_date: '2026-03-15', pulse_score: 68 }],
        error: null,
      },
      pulse_forecasts: {
        data: [{ forecast_date: '2026-04-25', value: 70 }],
        error: null,
      },
      colonia_dna_vectors: {
        data: { components: { cultural: 0.8 } },
        error: null,
      },
      ghost_zones_ranking: {
        data: { ghost_score: 15, transition_probability: 0.05, rank: 200 },
        error: null,
      },
      climate_zone_signatures: {
        data: { signature: '[1,2,3]', years_observed: 15 },
        error: null,
      },
      zone_constellations_edges: {
        data: [{ target_colonia_id: 'condesa-id', edge_weight: 0.9 }],
        error: null,
      },
      inegi_census_zone_stats: {
        data: {
          age_distribution: [],
          dominant_profession: 'creative',
          profession_distribution: {},
        },
        error: null,
      },
      enigh_zone_income: {
        data: { median_salary_mxn: 20000, salary_range_distribution: {} },
        error: null,
      },
    };
    const supabase = createMockSupabase(byTable);
    const ctx = await buildZoneContext(supabase, makeZoneRow());
    expect(ctx.zone_scores).toHaveLength(1);
    expect(ctx.dmx_indices).toHaveLength(1);
    expect(ctx.pulse_history).toHaveLength(1);
    expect(ctx.pulse_forecasts).toHaveLength(1);
    expect(ctx.dna_vector_components).not.toBeNull();
    expect(ctx.ghost).not.toBeNull();
    expect(ctx.climate).not.toBeNull();
    expect(ctx.edges).toHaveLength(1);
    expect(ctx.census).not.toBeNull();
    expect(ctx.income).not.toBeNull();
    expect(ctx.missing_sources).toEqual([]);
  });

  it('populates missing_sources when queries return null/empty', async () => {
    const byTable: MockTableMap = {
      zone_scores: { data: [], error: null },
      dmx_indices: { data: [], error: null },
      zone_pulse_scores: { data: [], error: null },
      pulse_forecasts: { data: [], error: null },
      colonia_dna_vectors: { data: null, error: null },
      ghost_zones_ranking: { data: null, error: null },
      climate_zone_signatures: { data: null, error: null },
      zone_constellations_edges: { data: [], error: null },
      inegi_census_zone_stats: { data: null, error: null },
      enigh_zone_income: { data: null, error: null },
    };
    const supabase = createMockSupabase(byTable);
    const ctx = await buildZoneContext(supabase, makeZoneRow());
    expect(ctx.missing_sources).toContain('zone_scores');
    expect(ctx.missing_sources).toContain('dmx_indices');
    expect(ctx.missing_sources).toContain('colonia_dna_vectors');
    expect(ctx.missing_sources).toContain('ghost_zones_ranking');
    expect(ctx.missing_sources).toContain('climate_zone_signatures');
    expect(ctx.missing_sources).toContain('enigh_zone_income');
    expect(ctx.missing_sources).toHaveLength(10);
  });
});

// ========================================================================
// Integration spy: 3 zones dummy
// ========================================================================

describe('integration — 3 dummy zones budget loop', () => {
  it('accumulates cost across 3 calls when each call consumes tokens', () => {
    const costs: number[] = [];
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const usage = {
        input_uncached: 500,
        input_cached: i === 0 ? 0 : 1500,
        cache_creation: i === 0 ? 1500 : 0,
        output: 500,
      };
      const c = calculateCostUsd(usage);
      costs.push(c);
      total += c;
    }
    expect(costs).toHaveLength(3);
    expect(total).toBeGreaterThan(0);
    // First call has cache_creation (more expensive); subsequent cheaper.
    const firstCost = costs[0];
    const secondCost = costs[1];
    if (firstCost != null && secondCost != null) {
      expect(firstCost).toBeGreaterThan(secondCost);
    }
  });

  it('SDK mock called once per zone in simple loop', async () => {
    const create = vi.fn(async () => makeHaikuResponse({ text: '{}' }));
    const anthropic = { messages: { create } } as unknown as {
      messages: {
        create: typeof create;
      };
    };
    const zones = [makeZoneRow(), makeZoneRow(), makeZoneRow()];
    for (const z of zones) {
      const ctx = makeFullZoneContext();
      ctx.zone = z;
      const messages = buildHaikuMessages(ctx);
      await callHaiku(anthropic, 'claude-haiku-4-5-20251001', messages);
    }
    expect(create).toHaveBeenCalledTimes(3);
  });
});
