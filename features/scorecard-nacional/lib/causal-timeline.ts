// BLOQUE 11.I.6 — Causal Timeline builder (12m+ narrative por colonia).
//
// Construye un bundle cronológico de explicaciones causales por zona,
// uniéndolas en un relato continuo. Si el consumer provee causalHook,
// la narrativa se genera vía LLM; si no, se sintetiza un stub
// determinístico concatenando las explanation_md en orden.
//
// UPGRADE L114 (11.I.6.6) — TG × Causal alerta integrada:
// alphaJourneyHook se llama ÚNICAMENTE para zonas que el consumer ya
// identificó como alpha (vía zone_alpha_alerts). El caller decide cuándo
// invocarlo; aquí solo transportamos el resultado al bundle.

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { CausalTimelineBundle, CausalTimelineEntry } from '../types';

type CausalClient = SupabaseClient<Database>;

type CausalHookResult = { text: string; citations: string[] };
export type CausalHook = (prompt: string) => Promise<CausalHookResult>;
export type AlphaJourneyHook = (zoneId: string) => Promise<string | null>;

// Conjunto autoritativo de los 15 índices DMX (registry.ts score_id 'DMX-*').
// Usado para tipar y validar el metric_id propagado a CausalTimelineEntry.
export const DMX_INDEX_CODES = [
  'DMX-IPV',
  'DMX-IAB',
  'DMX-IDS',
  'DMX-IRE',
  'DMX-ICO',
  'DMX-MOM',
  'DMX-LIV',
  'DMX-FAM',
  'DMX-YNG',
  'DMX-GRN',
  'DMX-STR',
  'DMX-INV',
  'DMX-DEV',
  'DMX-GNT',
  'DMX-STA',
] as const;

export type IndexCode = (typeof DMX_INDEX_CODES)[number];

export function isIndexCode(candidate: string): candidate is IndexCode {
  return (DMX_INDEX_CODES as readonly string[]).includes(candidate);
}

export const DEFAULT_INDEX_CODE: IndexCode = 'DMX-IPV';

interface BuildCausalTimelineOptions {
  readonly supabase?: CausalClient;
  readonly causalHook?: CausalHook;
  readonly alphaJourneyHook?: AlphaJourneyHook;
  readonly indexCode?: IndexCode;
}

interface CausalExplanationRow {
  readonly scope_id: string;
  readonly scope_type: string;
  readonly period_date: string;
  readonly explanation_md: string;
  readonly citations: unknown;
}

interface CitationRef {
  readonly ref_id?: unknown;
}

function normalizeCitations(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) {
    if (c && typeof c === 'object') {
      const candidate = (c as CitationRef).ref_id;
      if (typeof candidate === 'string' && candidate.length > 0) {
        out.push(candidate);
      }
    }
  }
  return out;
}

function monthsAgoIso(months: number, now: Date): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() - months;
  const target = new Date(Date.UTC(y, m, 1));
  const yy = target.getUTCFullYear();
  const mm = target.getUTCMonth() + 1;
  return `${String(yy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-01`;
}

async function fetchExplanations(
  supabase: CausalClient,
  zoneId: string,
  sinceIso: string,
  limit: number,
): Promise<readonly CausalExplanationRow[]> {
  const { data, error } = await supabase
    .from('causal_explanations')
    .select('scope_id, scope_type, period_date, explanation_md, citations')
    .eq('scope_id', zoneId)
    .gte('period_date', sinceIso)
    .order('period_date', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`causal_timeline: causal_explanations query failed: ${error.message}`);
  }
  return (data ?? []) as readonly CausalExplanationRow[];
}

function rowsToEntries(
  rows: readonly CausalExplanationRow[],
  zoneLabel: string,
  indexCode: IndexCode,
): readonly CausalTimelineEntry[] {
  return rows.map(
    (r): CausalTimelineEntry => ({
      zone_id: r.scope_id,
      zone_label: zoneLabel,
      period_date: r.period_date,
      metric_id: indexCode,
      value: null,
      delta: null,
      explanation_md: r.explanation_md,
      citations: normalizeCitations(r.citations),
    }),
  );
}

// Stub determinístico si no hay causalHook: concatena explanation_md en orden
// cronológico separadas por un párrafo puente. El texto resultante es seguro
// para SEO público (no inventa datos — solo une lo que ya está en la BD).
function buildDeterministicNarrative(
  entries: readonly CausalTimelineEntry[],
  zoneLabel: string,
): string {
  if (entries.length === 0) return '';
  const paragraphs: string[] = [];
  paragraphs.push(`Cronología de ${zoneLabel} (últimos ${entries.length} periodos):`);
  for (const e of entries) {
    paragraphs.push(`**${e.period_date}** — ${e.explanation_md.trim()}`);
  }
  return paragraphs.join('\n\n');
}

function buildLlmPrompt(zoneLabel: string, entries: readonly CausalTimelineEntry[]): string {
  const lines: string[] = [];
  lines.push(
    `Relata en un párrafo continuo (150-250 palabras, markdown es-MX) la historia de ${zoneLabel} a lo largo de los últimos ${entries.length} periodos, conectando las causas cronológicamente.`,
  );
  lines.push('');
  lines.push('Datos verificables (cítalos en orden):');
  for (const e of entries) {
    lines.push(`- ${e.period_date}: ${e.explanation_md.replace(/\s+/g, ' ').trim()}`);
  }
  lines.push('');
  lines.push('Reglas: tono narrativo Forbes/WSJ, cero hype, cita fuentes DMX.');
  return lines.join('\n');
}

export async function buildCausalTimeline(
  zoneId: string,
  countryCode: string,
  months: number,
  opts: BuildCausalTimelineOptions = {},
): Promise<CausalTimelineBundle> {
  const supabase = opts.supabase ?? createAdminClient();
  const indexCode: IndexCode = opts.indexCode ?? DEFAULT_INDEX_CODE;
  const now = new Date();
  const sinceIso = monthsAgoIso(months, now);

  const rows = await fetchExplanations(supabase, zoneId, sinceIso, months);
  const firstRow = rows[0];
  const scopeType = firstRow ? firstRow.scope_type : 'colonia';
  const zoneLabel = await resolveZoneLabel({
    scopeType,
    scopeId: zoneId,
    countryCode,
    supabase,
  });
  const entries = rowsToEntries(rows, zoneLabel, indexCode);

  let narrativeMd = '';
  if (opts.causalHook && entries.length > 0) {
    const prompt = buildLlmPrompt(zoneLabel, entries);
    const result = await opts.causalHook(prompt);
    narrativeMd = result.text;
  } else {
    narrativeMd = buildDeterministicNarrative(entries, zoneLabel);
  }

  let alphaJourneyMd: string | null = null;
  if (opts.alphaJourneyHook) {
    alphaJourneyMd = await opts.alphaJourneyHook(zoneId);
  }

  // countryCode used by zone-label resolver to scope zona_snapshots lookup;
  // causal_explanations itself has no country_code column — consumer must
  // already filter zoneId by country at resolution time.

  return {
    zone_id: zoneId,
    zone_label: zoneLabel,
    country_code: countryCode,
    months_covered: entries.length,
    entries,
    narrative_md: narrativeMd,
    alpha_journey_md: alphaJourneyMd,
  };
}
