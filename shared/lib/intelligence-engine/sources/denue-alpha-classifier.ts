// DENUE alpha classifier — BLOQUE 11.H Trend Genome sub-agent A (11.H.2).
// Queries public.denue_establishments for "alpha" openings (gentrification
// early signals) within the last 6 months for a given zone.
//
// Output contract: DenueAlphaSignals (features/trend-genome/types).
// Graceful degrade:
//   - Table missing → limitation 'DENUE_TABLE_NOT_FOUND', confidence 0.
//   - Empty result → limitation null, counts 0, confidence 0.6.
//   - Non-empty → confidence 0.7 + min(0.3, count/30).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlphaScopeType, DenueAlphaSignals } from '@/features/trend-genome/types';
import { DENUE_ALPHA_KEYWORDS } from '@/features/trend-genome/types';

const DENUE_TABLE = 'denue_establishments';
const LOOKBACK_DAYS = 180;
const SAMPLE_NAMES_MAX = 10;
const FETCH_ROW_LIMIT = 500;

const ZONE_CANDIDATE_FIELDS: readonly string[] = ['zone_id', 'colonia_id'] as const;
const DATE_CANDIDATE_FIELDS: readonly string[] = [
  'fecha_alta',
  'fecha_inicio',
  'fecha_apertura',
] as const;

const SPECIALTY_CAFE_KEYWORDS = [
  'especialidad',
  'slow coffee',
  'cafe especialidad',
  'specialty',
] as const;
const GALLERY_KEYWORDS = ['galería', 'galeria', 'gallery'] as const;
// "arte" is too short — it appears inside "artesanal" (boutique) and "cartera".
// Match it only as a whole word (with common Spanish accents).
const GALLERY_WHOLE_WORD_KEYWORDS = ['arte'] as const;
const BOUTIQUE_KEYWORDS = ['boutique', 'artesanal', 'independiente'] as const;

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

function isoDaysAgo(periodDate: string, days: number): string {
  const anchor = new Date(`${periodDate}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - days);
  return anchor.toISOString().slice(0, 10);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getString(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === 'string' ? v : '';
}

function containsAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  for (const k of keywords) {
    if (lower.includes(k.toLowerCase())) return true;
  }
  return false;
}

function containsWholeWord(text: string, keyword: string): boolean {
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${kw}([^\\p{L}\\p{N}]|$)`, 'u');
  return re.test(lower);
}

function containsAnyWholeWord(text: string, keywords: readonly string[]): boolean {
  for (const k of keywords) {
    if (containsWholeWord(text, k)) return true;
  }
  return false;
}

export interface ClassifyDenueParams {
  readonly zoneId: string;
  readonly scopeType: AlphaScopeType;
  readonly countryCode: string;
  readonly period: string; // ISO date YYYY-MM-DD
  readonly supabase: SupabaseClient;
}

interface CandidateRow {
  readonly nombre: string;
  readonly actividad: string;
  readonly razon: string;
  readonly dateValue: string;
}

function extractRow(raw: unknown, dateField: string): CandidateRow | null {
  if (!isRecord(raw)) return null;
  return {
    nombre: getString(raw, 'nombre_establecimiento'),
    actividad: getString(raw, 'actividad_economica'),
    razon: getString(raw, 'razon_social'),
    dateValue: getString(raw, dateField),
  };
}

function rowMatchesAlphaKeyword(row: CandidateRow): boolean {
  const blob = `${row.nombre} ${row.actividad} ${row.razon}`;
  return containsAny(blob, DENUE_ALPHA_KEYWORDS);
}

function emptySignals(limitation: string | null, confidence: number): DenueAlphaSignals {
  return {
    specialty_cafe_count: 0,
    gallery_count: 0,
    boutique_count: 0,
    total_alpha_openings_6m: 0,
    sample_names: [],
    source_confidence: confidence,
    limitation,
  };
}

function computeConfidence(count: number): number {
  return 0.7 + Math.min(0.3, count / 30);
}

interface QueryResult {
  readonly rows: readonly CandidateRow[];
  readonly tableExists: boolean;
}

async function tryQuery(
  p: ClassifyDenueParams,
  zoneField: string,
  dateField: string,
): Promise<QueryResult | null> {
  const fromDate = isoDaysAgo(p.period, LOOKBACK_DAYS);
  const selectCols = `nombre_establecimiento, actividad_economica, razon_social, ${dateField}`;
  try {
    const res = await castFrom(p.supabase, DENUE_TABLE)
      .select(selectCols)
      .eq(zoneField, p.zoneId)
      .gte(dateField, fromDate)
      .lte(dateField, p.period)
      .limit(FETCH_ROW_LIMIT);
    if (res.error) return null;
    const data = res.data as unknown;
    if (!Array.isArray(data)) return { rows: [], tableExists: true };
    const rows: CandidateRow[] = [];
    for (const raw of data) {
      const row = extractRow(raw, dateField);
      if (!row) continue;
      rows.push(row);
    }
    return { rows, tableExists: true };
  } catch {
    return null;
  }
}

export async function classifyDenueAperturas(p: ClassifyDenueParams): Promise<DenueAlphaSignals> {
  let result: QueryResult | null = null;
  for (const zoneField of ZONE_CANDIDATE_FIELDS) {
    for (const dateField of DATE_CANDIDATE_FIELDS) {
      const r = await tryQuery(p, zoneField, dateField);
      if (r !== null) {
        result = r;
        break;
      }
    }
    if (result !== null) break;
  }

  if (result === null) {
    return emptySignals('DENUE_TABLE_NOT_FOUND', 0);
  }

  // Filter alpha keyword matches.
  const matched = result.rows.filter(rowMatchesAlphaKeyword);

  if (matched.length === 0) {
    return emptySignals(null, 0.6);
  }

  let specialtyCafeCount = 0;
  let galleryCount = 0;
  let boutiqueCount = 0;

  for (const row of matched) {
    const blob = `${row.nombre} ${row.actividad} ${row.razon}`;
    if (containsAny(blob, SPECIALTY_CAFE_KEYWORDS)) specialtyCafeCount += 1;
    if (
      containsAny(blob, GALLERY_KEYWORDS) ||
      containsAnyWholeWord(blob, GALLERY_WHOLE_WORD_KEYWORDS)
    ) {
      galleryCount += 1;
    }
    if (containsAny(blob, BOUTIQUE_KEYWORDS)) boutiqueCount += 1;
  }

  // sample_names ordered by dateValue desc (most recent first), up to 10.
  const sorted = [...matched].sort((a, b) => {
    if (a.dateValue === b.dateValue) return 0;
    return a.dateValue < b.dateValue ? 1 : -1;
  });
  const sampleNames: string[] = [];
  for (const row of sorted) {
    if (sampleNames.length >= SAMPLE_NAMES_MAX) break;
    const name = row.nombre.length > 0 ? row.nombre : row.razon;
    if (name.length > 0) sampleNames.push(name);
  }

  return {
    specialty_cafe_count: specialtyCafeCount,
    gallery_count: galleryCount,
    boutique_count: boutiqueCount,
    total_alpha_openings_6m: matched.length,
    sample_names: sampleNames,
    source_confidence: computeConfidence(matched.length),
    limitation: null,
  };
}
