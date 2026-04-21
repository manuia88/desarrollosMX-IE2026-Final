// FASE 11 XL — BLOQUE 11.C.
// Orchestrator para los 15 índices DMX (IPV, IAB, IDS, IRE, ICO, MOM, LIV,
// FAM, YNG, GRN, STR, INV, DEV, GNT, STA). Corre calculators en Promise.allSettled
// y persiste en tabla public.dmx_indices (migration 20260421100000). INV es el
// único índice project-scope (los otros 14 son zone-scope colonia/alcaldia/
// city/estado).
//
// Responsabilidades:
//   - calculateIndexForScope: corre 1 calc + UPSERT dmx_indices (salvo shadow).
//   - calculateAllIndicesForScope: 15 en paralelo via allSettled, 1 falla no
//     tumba el batch.
//   - calculateAllIndicesForCDMXColonias: descubre zonas CDMX, corre los 15
//     indices por colonia en chunks de 10, segundo pass UPDATE ranking +
//     percentile (sort desc per index_code dentro del período).
//
// NO orquesta Sentry ni HTTP — eso vive en la API route (scope sub-agent B).
// NO persiste si shadow_mode=true.
// auditLog flag propaga a cada calculator via input.params.audit_log — los
// calculators escriben best-effort a dmx_indices_audit_log.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Calculator, CalculatorInput, Confidence } from '../base';
import { runPulseScoreForScope } from '../pulse';
import dmxDevCalculator from './dev';
import dmxFamCalculator from './fam';
import dmxGntCalculator from './gnt';
import dmxGrnCalculator from './grn';
import iabCalculator from './iab';
import icoCalculator from './ico';
import idsCalculator from './ids';
import dmxInvCalculator from './inv';
import ipvCalculator from './ipv';
import ireCalculator from './ire';
import dmxLivCalculator from './liv';
import dmxMomCalculator from './mom';
import dmxStaCalculator from './sta';
import dmxStrCalculator from './str';
import dmxYngCalculator from './yng';

type LooseClient = SupabaseClient<Record<string, unknown>>;

function looseFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

export type IndexScope = 'zone' | 'project';

export interface OrchestratorOptions {
  readonly shadowMode?: boolean;
  readonly auditLog?: boolean;
}

export interface SingleIndexResult {
  readonly indexCode: string;
  readonly ok: boolean;
  readonly value?: number;
  readonly confidence?: Confidence;
  readonly error?: string;
  readonly circuit_breaker_triggered?: boolean;
  readonly duration_ms: number;
}

export interface BatchResult {
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly SingleIndexResult[];
  readonly duration_ms: number;
}

export interface CDMXBatchSummary {
  readonly zones_processed: number;
  readonly indices_computed: number;
  readonly failures: number;
  readonly duration_ms: number;
}

// Los 15 calculators indexados por score_id del registry. Exportado para
// permitir inyección en tests (params.calculators override).
export const INDEX_CALCULATORS: Readonly<Record<string, Calculator>> = {
  'DMX-IPV': ipvCalculator,
  'DMX-IAB': iabCalculator,
  'DMX-IDS': idsCalculator,
  'DMX-IRE': ireCalculator,
  'DMX-ICO': icoCalculator,
  'DMX-MOM': dmxMomCalculator,
  'DMX-LIV': dmxLivCalculator,
  'DMX-FAM': dmxFamCalculator,
  'DMX-YNG': dmxYngCalculator,
  'DMX-GRN': dmxGrnCalculator,
  'DMX-STR': dmxStrCalculator,
  'DMX-INV': dmxInvCalculator,
  'DMX-DEV': dmxDevCalculator,
  'DMX-GNT': dmxGntCalculator,
  'DMX-STA': dmxStaCalculator,
} as const;

// Scope support matrix. dmx_indices table accepts solo colonia/alcaldia/city/
// estado (zone scopes). INV es el único project-scope; no cabe en dmx_indices
// con su CHECK constraint y se persiste en project_scores via el propio calc
// (que no usa dmx_indices). Por eso el orchestrator filtra out INV del batch
// zone y solo lo corre para scope='project'.
const ZONE_INDEX_CODES: readonly string[] = [
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
  'DMX-DEV',
  'DMX-GNT',
  'DMX-STA',
] as const;

const PROJECT_INDEX_CODES: readonly string[] = ['DMX-INV'] as const;

export function indexCodesForScope(scopeType: IndexScope): readonly string[] {
  return scopeType === 'zone' ? ZONE_INDEX_CODES : PROJECT_INDEX_CODES;
}

// dmx_indices table usa scope_type ∈ ('colonia','alcaldia','city','estado').
// Default 'colonia' cuando el caller no especifica — la mayoría de CDMX data
// entra por colonia. Caller puede sobreescribir via params.dmxScopeType.
const DEFAULT_DMX_SCOPE_TYPE = 'colonia';
const DEFAULT_PERIOD_TYPE = 'monthly';

// Chunk size para batches en CDMX — balance entre throughput y carga DB.
const CDMX_CHUNK_SIZE = 10;

// UPSERT onConflict key — coincide con UNIQUE constraint declarado en
// migration fase11_xl_dmx_indices_schema.sql L61.
const DMX_INDICES_CONFLICT_KEY =
  'index_code,scope_type,scope_id,country_code,period_date,period_type,methodology_version,is_shadow';

function stripDmxPrefix(code: string): string {
  return code.startsWith('DMX-') ? code.slice(4) : code;
}

function scoreBandFromValue(value: number, confidence: Confidence): string | null {
  if (confidence === 'insufficient_data') return null;
  if (value >= 85) return 'excelente';
  if (value >= 70) return 'bueno';
  if (value >= 50) return 'regular';
  return 'bajo';
}

interface PersistParams {
  readonly indexCode: string;
  readonly scopeType: string; // dmx_indices scope_type (colonia/alcaldia/city/estado)
  readonly scopeId: string;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly periodType: string;
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: Readonly<Record<string, unknown>>;
  readonly inputsUsed: Readonly<Record<string, unknown>>;
  readonly circuitBreakerTriggered: boolean;
  readonly trendVsPrevious: number | null;
  readonly trendDirection: string | null;
  readonly isShadow: boolean;
  readonly validUntil: string | null;
  readonly calculatorVersion: string;
}

async function persistToDmxIndices(supabase: SupabaseClient, params: PersistParams): Promise<void> {
  const row: Record<string, unknown> = {
    index_code: stripDmxPrefix(params.indexCode),
    scope_type: params.scopeType,
    scope_id: params.scopeId,
    country_code: params.countryCode,
    period_date: params.periodDate,
    period_type: params.periodType,
    value: params.value,
    components: params.components,
    inputs_used: params.inputsUsed,
    confidence: params.confidence,
    score_band: scoreBandFromValue(params.value, params.confidence),
    methodology_version: `v${params.calculatorVersion}`,
    circuit_breaker_triggered: params.circuitBreakerTriggered,
    is_shadow: params.isShadow,
    calculated_at: new Date().toISOString(),
  };
  if (params.trendVsPrevious !== null) row.trend_vs_previous = params.trendVsPrevious;
  if (params.trendDirection !== null) row.trend_direction = params.trendDirection;
  if (params.validUntil !== null) row.valid_until = params.validUntil;

  const { error } = await looseFrom(supabase, 'dmx_indices').upsert(
    row as never,
    {
      onConflict: DMX_INDICES_CONFLICT_KEY,
    } as never,
  );
  if (error) {
    throw new Error(`dmx_indices upsert failed: ${error.message ?? 'unknown'}`);
  }
}

function extractMetaFlag(components: Readonly<Record<string, unknown>>, key: string): boolean {
  const meta = (components as { _meta?: Record<string, unknown> })._meta;
  if (!meta) return false;
  const v = meta[key];
  return v === true;
}

export interface CalculateIndexForScopeParams {
  readonly indexCode: string;
  readonly scopeType: IndexScope;
  readonly scopeId: string;
  readonly periodDate: string;
  readonly countryCode: string;
  readonly supabase: SupabaseClient;
  readonly options?: OrchestratorOptions;
  // Override del registry para tests. Default usa INDEX_CALCULATORS.
  readonly calculators?: Readonly<Record<string, Calculator>>;
  // Override del scope_type que va a dmx_indices (colonia/alcaldia/city/estado).
  // Default 'colonia'. Solo aplica si scopeType='zone'.
  readonly dmxScopeType?: string;
  readonly periodType?: string;
}

export async function calculateIndexForScope(
  params: CalculateIndexForScopeParams,
): Promise<SingleIndexResult> {
  const start = Date.now();
  const options = params.options ?? {};
  const registry = params.calculators ?? INDEX_CALCULATORS;

  const calc = registry[params.indexCode];
  if (!calc) {
    return {
      indexCode: params.indexCode,
      ok: false,
      error: 'unknown_index',
      duration_ms: Date.now() - start,
    };
  }

  const zoneIndices = ZONE_INDEX_CODES as readonly string[];
  const projectIndices = PROJECT_INDEX_CODES as readonly string[];
  if (params.scopeType === 'zone' && !zoneIndices.includes(params.indexCode)) {
    return {
      indexCode: params.indexCode,
      ok: false,
      error: `${params.indexCode} not supported for scope=zone`,
      duration_ms: Date.now() - start,
    };
  }
  if (params.scopeType === 'project' && !projectIndices.includes(params.indexCode)) {
    return {
      indexCode: params.indexCode,
      ok: false,
      error: `${params.indexCode} not supported for scope=project`,
      duration_ms: Date.now() - start,
    };
  }

  const calcInput: CalculatorInput = {
    ...(params.scopeType === 'zone' ? { zoneId: params.scopeId } : { projectId: params.scopeId }),
    countryCode: params.countryCode,
    periodDate: params.periodDate,
    params: {
      audit_log: options.auditLog === true,
      shadow_mode: options.shadowMode === true,
    },
  };

  try {
    const output = await calc.run(calcInput, params.supabase);
    const circuitBreaker = extractMetaFlag(output.components, 'circuit_breaker_triggered');

    // INV es project scope → NO persiste en dmx_indices (CHECK constraint
    // rechaza project). Solo retorna valor. Persist hook project lives en
    // project_scores via runScore — fuera del alcance del orchestrator XL.
    if (params.scopeType === 'zone' && options.shadowMode !== true) {
      await persistToDmxIndices(params.supabase, {
        indexCode: params.indexCode,
        scopeType: params.dmxScopeType ?? DEFAULT_DMX_SCOPE_TYPE,
        scopeId: params.scopeId,
        countryCode: params.countryCode,
        periodDate: params.periodDate,
        periodType: params.periodType ?? DEFAULT_PERIOD_TYPE,
        value: output.score_value,
        confidence: output.confidence,
        components: output.components,
        inputsUsed: output.inputs_used,
        circuitBreakerTriggered: circuitBreaker,
        trendVsPrevious: output.trend_vs_previous ?? null,
        trendDirection: output.trend_direction ?? null,
        isShadow: false,
        validUntil: output.valid_until ?? null,
        calculatorVersion: calc.version,
      });
    }

    return {
      indexCode: params.indexCode,
      ok: true,
      value: output.score_value,
      confidence: output.confidence,
      circuit_breaker_triggered: circuitBreaker,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'calculator_error';
    return {
      indexCode: params.indexCode,
      ok: false,
      error: message,
      duration_ms: Date.now() - start,
    };
  }
}

export interface CalculateAllIndicesForScopeParams {
  readonly scopeType: IndexScope;
  readonly scopeId: string;
  readonly periodDate: string;
  readonly countryCode: string;
  readonly supabase: SupabaseClient;
  readonly options?: OrchestratorOptions;
  readonly calculators?: Readonly<Record<string, Calculator>>;
  readonly dmxScopeType?: string;
  readonly periodType?: string;
}

export async function calculateAllIndicesForScope(
  params: CalculateAllIndicesForScopeParams,
): Promise<BatchResult> {
  const start = Date.now();
  const codes = indexCodesForScope(params.scopeType);

  const settled = await Promise.allSettled(
    codes.map((indexCode) =>
      calculateIndexForScope({
        indexCode,
        scopeType: params.scopeType,
        scopeId: params.scopeId,
        periodDate: params.periodDate,
        countryCode: params.countryCode,
        supabase: params.supabase,
        ...(params.options ? { options: params.options } : {}),
        ...(params.calculators ? { calculators: params.calculators } : {}),
        ...(params.dmxScopeType ? { dmxScopeType: params.dmxScopeType } : {}),
        ...(params.periodType ? { periodType: params.periodType } : {}),
      }),
    ),
  );

  const results: SingleIndexResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    const code = codes[i] ?? 'unknown';
    const msg = s.reason instanceof Error ? s.reason.message : 'rejected';
    return {
      indexCode: code,
      ok: false,
      error: msg,
      duration_ms: 0,
    };
  });
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  return {
    succeeded,
    failed,
    results,
    duration_ms: Date.now() - start,
  };
}

// Discover colonias CDMX: dmx_indices migration no trae catálogo de zonas con
// columna city; fallback robusto lee zona_snapshots (MX) o acepta lista
// pre-cargada via params.zoneIds. Query primaria: zone_price_index (scope MX)
// para obtener zone_ids distintos. Segunda: zona_snapshots. Si ambos fallan,
// retornar lista vacía.
export async function discoverCDMXColoniaZones(
  supabase: SupabaseClient,
  periodDate: string,
): Promise<readonly string[]> {
  try {
    const anchor = new Date(`${periodDate}T00:00:00Z`);
    const lookback = new Date(anchor.getTime());
    lookback.setUTCDate(lookback.getUTCDate() - 120);
    const fromISO = lookback.toISOString().slice(0, 10);
    const { data, error } = await looseFrom(supabase, 'zona_snapshots')
      .select('zone_id')
      .eq('country_code', 'MX')
      .gte('period', fromISO)
      .lte('period', periodDate)
      .limit(5000);
    if (error || !data) return [];
    const rows = data as unknown as Array<{ zone_id: string }>;
    const uniq = new Set<string>();
    for (const r of rows) {
      if (r?.zone_id) uniq.add(r.zone_id);
    }
    return [...uniq];
  } catch {
    return [];
  }
}

async function updateRankingForIndex(
  supabase: SupabaseClient,
  indexCode: string,
  periodDate: string,
  countryCode: string,
  periodType: string,
): Promise<number> {
  // Fetch todas las filas del período (solo no-shadow) ordenadas desc.
  const stripped = stripDmxPrefix(indexCode);
  const { data, error } = await looseFrom(supabase, 'dmx_indices')
    .select('id, value')
    .eq('index_code', stripped)
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .eq('period_type', periodType)
    .eq('is_shadow', false)
    .order('value', { ascending: false });
  if (error || !data) return 0;
  const rows = data as unknown as Array<{ id: string; value: number }>;
  const total = rows.length;
  if (total === 0) return 0;
  let updated = 0;
  // Sequential UPDATE por id. Evitamos bulk update porque cada row lleva rank
  // distinto. Chunk-free — total típico <500 por index × CDMX.
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const position = i + 1;
    const percentile = Number((((total - position) / total) * 100).toFixed(2));
    const upd = await looseFrom(supabase, 'dmx_indices')
      .update({ ranking_in_scope: position, percentile } as never)
      .eq('id', r.id);
    if (!upd.error) updated++;
  }
  return updated;
}

export interface CalculateAllIndicesForCDMXColoniasParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient;
  readonly options?: OrchestratorOptions;
  // Override explícito de zones a procesar (CI / tests / reprocess). Si se
  // omite, se descubren via zona_snapshots MX.
  readonly zoneIds?: readonly string[];
  readonly calculators?: Readonly<Record<string, Calculator>>;
  readonly dmxScopeType?: string;
  readonly periodType?: string;
  readonly chunkSize?: number;
}

export async function calculateAllIndicesForCDMXColonias(
  params: CalculateAllIndicesForCDMXColoniasParams,
): Promise<CDMXBatchSummary> {
  const start = Date.now();
  const options = params.options ?? {};
  const chunkSize = params.chunkSize ?? CDMX_CHUNK_SIZE;
  const zoneIds =
    params.zoneIds ?? (await discoverCDMXColoniaZones(params.supabase, params.periodDate));

  if (zoneIds.length === 0) {
    return {
      zones_processed: 0,
      indices_computed: 0,
      failures: 0,
      duration_ms: Date.now() - start,
    };
  }

  let indices_computed = 0;
  let failures = 0;

  for (let i = 0; i < zoneIds.length; i += chunkSize) {
    const chunk = zoneIds.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map((zoneId) =>
        calculateAllIndicesForScope({
          scopeType: 'zone',
          scopeId: zoneId,
          periodDate: params.periodDate,
          countryCode: 'MX',
          supabase: params.supabase,
          ...(params.options ? { options: params.options } : {}),
          ...(params.calculators ? { calculators: params.calculators } : {}),
          ...(params.dmxScopeType ? { dmxScopeType: params.dmxScopeType } : {}),
          ...(params.periodType ? { periodType: params.periodType } : {}),
        }),
      ),
    );
    for (const br of chunkResults) {
      indices_computed += br.succeeded;
      failures += br.failed;
    }
  }

  // Segundo pass — ranking + percentile post-persist. Skip si shadow_mode
  // (no persistimos nada, nada que rankear).
  if (options.shadowMode !== true) {
    const periodType = params.periodType ?? DEFAULT_PERIOD_TYPE;
    await Promise.all(
      ZONE_INDEX_CODES.map((code) =>
        updateRankingForIndex(params.supabase, code, params.periodDate, 'MX', periodType),
      ),
    );
  }

  return {
    zones_processed: zoneIds.length,
    indices_computed,
    failures,
    duration_ms: Date.now() - start,
  };
}

// FASE 11 XL — BLOQUE 11.F Pulse Score batch orchestrator.
// Pulse Score es un índice compuesto agregado (vive en `../pulse`) que corre
// POR scope como los 14 zone-indices. A diferencia del orchestrator de los
// 15, pulse se persiste en su propia tabla (scope sub-agent A) y NO pasa por
// dmx_indices — por eso tiene summary separado.

export interface CalculatePulseBatchSummary {
  readonly zones_processed: number;
  readonly pulse_computed: number;
  readonly failures: number;
  readonly duration_ms: number;
}

export interface CalculateAllPulseForCDMXColoniasParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient;
  readonly zoneIds?: readonly string[];
  readonly chunkSize?: number;
  readonly scopeType?: 'colonia' | 'alcaldia' | 'city' | 'estado';
}

export async function calculateAllPulseForCDMXColonias(
  params: CalculateAllPulseForCDMXColoniasParams,
): Promise<CalculatePulseBatchSummary> {
  const start = Date.now();
  const chunkSize = params.chunkSize ?? CDMX_CHUNK_SIZE;
  const scopeType = params.scopeType ?? 'colonia';
  const zoneIds =
    params.zoneIds ?? (await discoverCDMXColoniaZones(params.supabase, params.periodDate));

  if (zoneIds.length === 0) {
    return {
      zones_processed: 0,
      pulse_computed: 0,
      failures: 0,
      duration_ms: Date.now() - start,
    };
  }

  let pulse_computed = 0;
  let failures = 0;

  for (let i = 0; i < zoneIds.length; i += chunkSize) {
    const chunk = zoneIds.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map((zoneId) =>
        runPulseScoreForScope({
          scopeType,
          scopeId: zoneId,
          countryCode: 'MX',
          periodDate: params.periodDate,
          supabase: params.supabase,
        }),
      ),
    );
    for (const r of chunkResults) {
      if (r.ok) pulse_computed++;
      else failures++;
    }
  }

  return {
    zones_processed: zoneIds.length,
    pulse_computed,
    failures,
    duration_ms: Date.now() - start,
  };
}
