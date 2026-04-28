// FASE 15 v3 — B.2 Unit-level demand score engine
// Reference: ADR-060 + M11 APPEND v3 (Onyx M2 anchor +30% eficiencia op)
//
// Computa demand_score_30d 0-100 por unidad usando señales disponibles:
//   60% landing_analytics views proyecto-level últimos 30d (prorrateado por unidades activas)
//   25% qr_codes.scan_count cumulative WHERE destino_type='unidad' AND destino_id=unit_id::text
//   15% busquedas count últimos 30d WHERE matched_count > 0 (proyecto-level prorrateado)
//
// Memoria 13 escalable: jsonb extensible — wishlist H2 + busqueda_matches H2 (L-NEW post-launch)
// flag is_partial_signal=true + missing_signals=['wishlist','busqueda_matches'] explícito.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface UnitDemandSignals {
  readonly landing_views_30d: number;
  readonly qr_scans_total: number;
  readonly busquedas_matched_30d: number;
  readonly project_age_days: number;
  readonly project_units_active: number;
  readonly is_partial_signal: boolean;
  readonly missing_signals: readonly string[];
  readonly computed_at: string;
}

export interface UnitDemandResult {
  readonly unit_id: string;
  readonly score: number;
  readonly color: 'red' | 'amber' | 'green';
  readonly signals: UnitDemandSignals;
}

interface ComputeContext {
  readonly supabase: SupabaseClient;
}

const WEIGHT_LANDING = 0.6;
const WEIGHT_QR = 0.25;
const WEIGHT_BUSQUEDAS = 0.15;

const MAX_LANDING_VIEWS_PER_UNIT = 100;
const MAX_QR_SCANS = 50;
const MAX_BUSQUEDAS_PER_UNIT = 30;

export async function computeUnitDemandScore(
  unitId: string,
  ctx: ComputeContext,
): Promise<UnitDemandResult> {
  const { supabase } = ctx;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: unit, error: unitErr } = await supabase
    .from('unidades')
    .select('id, proyecto_id, created_at')
    .eq('id', unitId)
    .single();

  if (unitErr || !unit) {
    return zeroResult(unitId, 'unit_not_found');
  }

  const proyectoId = unit.proyecto_id;

  const [landingResult, qrResult, busquedasResult, projectUnitsResult] = await Promise.all([
    countLandingViewsForProject(supabase, proyectoId, since30d),
    sumQRScansForUnit(supabase, unitId),
    countBusquedasMatched(supabase, proyectoId, since30d),
    countActiveUnitsInProject(supabase, proyectoId),
  ]);

  const landingViews = landingResult ?? 0;
  const qrScans = qrResult ?? 0;
  const busquedasMatched = busquedasResult ?? 0;
  const projectUnitsActive = Math.max(1, projectUnitsResult ?? 1);

  const projectAgeDays = unit.created_at
    ? Math.max(
        1,
        Math.floor((Date.now() - new Date(unit.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      )
    : 1;

  const landingPerUnit = landingViews / projectUnitsActive;
  const busquedasPerUnit = busquedasMatched / projectUnitsActive;

  const landingScore = clamp01(landingPerUnit / MAX_LANDING_VIEWS_PER_UNIT) * WEIGHT_LANDING * 100;
  const qrScore = clamp01(qrScans / MAX_QR_SCANS) * WEIGHT_QR * 100;
  const busquedasScore =
    clamp01(busquedasPerUnit / MAX_BUSQUEDAS_PER_UNIT) * WEIGHT_BUSQUEDAS * 100;

  const score = Math.round(landingScore + qrScore + busquedasScore);

  const signals: UnitDemandSignals = {
    landing_views_30d: landingViews,
    qr_scans_total: qrScans,
    busquedas_matched_30d: busquedasMatched,
    project_age_days: projectAgeDays,
    project_units_active: projectUnitsActive,
    is_partial_signal: true,
    missing_signals: ['wishlist', 'busqueda_matches_unit_level'],
    computed_at: new Date().toISOString(),
  };

  return {
    unit_id: unitId,
    score: Math.min(100, Math.max(0, score)),
    color: scoreToColor(score),
    signals,
  };
}

export async function batchComputeProjectDemandScores(
  proyectoId: string,
  ctx: ComputeContext,
): Promise<readonly UnitDemandResult[]> {
  const { supabase } = ctx;

  const { data: units, error } = await supabase
    .from('unidades')
    .select('id')
    .eq('proyecto_id', proyectoId);

  if (error || !units) return [];

  const results = await Promise.all(units.map((u) => computeUnitDemandScore(u.id, ctx)));
  return results;
}

export async function persistUnitDemandScore(
  result: UnitDemandResult,
  ctx: ComputeContext,
): Promise<void> {
  const { supabase } = ctx;

  await supabase
    .from('unidades')
    .update({
      demand_score_30d: result.score,
      demand_signals: result.signals as never,
    })
    .eq('id', result.unit_id);
}

async function countLandingViewsForProject(
  supabase: SupabaseClient,
  proyectoId: string,
  since: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from('landing_analytics')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'view')
    .gte('created_at', since)
    .in(
      'landing_id',
      (await supabase.from('landings').select('id').eq('proyecto_id', proyectoId)).data?.map(
        (l) => l.id,
      ) ?? [],
    );

  if (error) return null;
  return count ?? 0;
}

async function sumQRScansForUnit(supabase: SupabaseClient, unitId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('scan_count')
    .eq('destino_type', 'unidad')
    .eq('destino_id', unitId);

  if (error) return null;
  return (data ?? []).reduce((sum, r) => sum + (r.scan_count ?? 0), 0);
}

async function countBusquedasMatched(
  supabase: SupabaseClient,
  proyectoId: string,
  since: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from('busquedas')
    .select('id', { count: 'exact', head: true })
    .gte('last_run_at', since)
    .gt('matched_count', 0)
    .filter('criteria->proyecto_id', 'eq', proyectoId);

  if (error) return null;
  return count ?? 0;
}

async function countActiveUnitsInProject(
  supabase: SupabaseClient,
  proyectoId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from('unidades')
    .select('id', { count: 'exact', head: true })
    .eq('proyecto_id', proyectoId);

  if (error) return null;
  return count ?? 0;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function scoreToColor(score: number): 'red' | 'amber' | 'green' {
  if (score < 30) return 'red';
  if (score < 70) return 'amber';
  return 'green';
}

function zeroResult(unitId: string, reason: string): UnitDemandResult {
  return {
    unit_id: unitId,
    score: 0,
    color: 'red',
    signals: {
      landing_views_30d: 0,
      qr_scans_total: 0,
      busquedas_matched_30d: 0,
      project_age_days: 0,
      project_units_active: 0,
      is_partial_signal: true,
      missing_signals: ['wishlist', 'busqueda_matches_unit_level', reason],
      computed_at: new Date().toISOString(),
    },
  };
}
