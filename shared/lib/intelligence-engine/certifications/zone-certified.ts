// L-32 FASE 10 SESIÓN 3/3 — DMX Zone Certified hooks (activación H2).
// Evalúa si una zona califica para el badge "DMX Zone Certified" según:
//   - E01 Full Project Score ≥ 90 últimos 12 meses consecutivos
//   - N11 Momentum stability_index ≥ 0.85 (rolling 12m)
//   - Sin crisis alerts últimos 12 meses (L-50 dependencia H2 — por ahora
//     fallback sin crisis_alerts table → asume OK hasta que exista)
//
// H1: helper + endpoint admin /api/admin/zones/[id]/certify GET.
// Automatic awarding NO se ejecuta — founder/admin approve manual primeras
// 10 zonas para validar criteria. UI badge viene FASE 21.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CertificationCriteria {
  readonly e01_avg_12m: number | null;
  readonly e01_months_above_90: number;
  readonly n11_stability_12m: number | null;
  readonly crisis_alerts_12m: number;
}

export interface CertificationEvaluation {
  readonly zone_id: string;
  readonly qualifies: boolean;
  readonly criteria: CertificationCriteria;
  readonly reasons: readonly string[];
  readonly evaluated_at: string;
}

const REQUIRED_E01_MIN = 90;
const REQUIRED_E01_CONSECUTIVE_MONTHS = 12;
const REQUIRED_N11_STABILITY = 0.85;
const MAX_CRISIS_ALERTS = 0;

export async function evaluateZoneCertification(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
): Promise<CertificationEvaluation> {
  const evaluatedAt = new Date().toISOString();
  const criteria: CertificationCriteria = {
    e01_avg_12m: null,
    e01_months_above_90: 0,
    n11_stability_12m: null,
    crisis_alerts_12m: 0,
  };
  const reasons: string[] = [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const fromDate = twelveMonthsAgo.toISOString().slice(0, 10);

  // E01 rolling 12m desde score_history.
  try {
    const { data: e01History } = await (supabase as unknown as SupabaseClient)
      .from('score_history' as never)
      .select('score_value, period_date')
      .eq('entity_type' as never, 'zone')
      .eq('entity_id' as never, zoneId)
      .eq('country_code' as never, countryCode)
      .eq('score_type' as never, 'E01')
      .gte('period_date' as never, fromDate)
      .order('period_date' as never, { ascending: true });
    const rows = (e01History ?? []) as unknown as Array<{ score_value: number }>;
    const values = rows
      .map((r) => r.score_value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (values.length > 0) {
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const monthsAbove = values.filter((v) => v >= REQUIRED_E01_MIN).length;
      Object.assign(criteria, {
        e01_avg_12m: Number(avg.toFixed(2)),
        e01_months_above_90: monthsAbove,
      });
    }
  } catch {
    // fallback silencioso — reason añadido abajo
  }

  // N11 stability_index actual desde zone_scores.
  try {
    const { data: n11Row } = await (supabase as unknown as SupabaseClient)
      .from('zone_scores' as never)
      .select('stability_index')
      .eq('zone_id' as never, zoneId)
      .eq('score_type' as never, 'N11')
      .eq('country_code' as never, countryCode)
      .order('period_date' as never, { ascending: false })
      .limit(1);
    const rows = (n11Row ?? []) as unknown as Array<{ stability_index: number | null }>;
    const first = rows[0];
    if (first && typeof first.stability_index === 'number') {
      Object.assign(criteria, { n11_stability_12m: first.stability_index });
    }
  } catch {
    // fallback silencioso
  }

  // Crisis alerts 12m — H2 tabla crisis_alerts no existe H1, asume 0.
  // Cuando L-50 aterrice, agregar select * from crisis_alerts where zone_id=? and created_at>?.

  // Evaluación final:
  if (
    criteria.e01_avg_12m === null ||
    criteria.e01_months_above_90 < REQUIRED_E01_CONSECUTIVE_MONTHS
  ) {
    reasons.push(
      `E01 insuficiente: ${criteria.e01_months_above_90}/${REQUIRED_E01_CONSECUTIVE_MONTHS} meses >= ${REQUIRED_E01_MIN} (avg ${criteria.e01_avg_12m ?? 'n/a'})`,
    );
  }
  if (criteria.n11_stability_12m === null || criteria.n11_stability_12m < REQUIRED_N11_STABILITY) {
    reasons.push(
      `N11 Momentum stability ${criteria.n11_stability_12m ?? 'n/a'} < ${REQUIRED_N11_STABILITY}`,
    );
  }
  if (criteria.crisis_alerts_12m > MAX_CRISIS_ALERTS) {
    reasons.push(`Crisis alerts últimos 12m: ${criteria.crisis_alerts_12m}`);
  }

  const qualifies = reasons.length === 0;
  return {
    zone_id: zoneId,
    qualifies,
    criteria,
    reasons,
    evaluated_at: evaluatedAt,
  };
}

// Helper para el endpoint admin: retorna la evaluación + flag si ya está certificada.
export async function getZoneCertificationStatus(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
): Promise<CertificationEvaluation & { readonly is_certified: boolean }> {
  const evaluation = await evaluateZoneCertification(supabase, zoneId, countryCode);
  let isCertified = false;
  try {
    const { data } = await (supabase as unknown as SupabaseClient)
      .from('zone_certifications' as never)
      .select('is_active')
      .eq('zone_id' as never, zoneId)
      .eq('country_code' as never, countryCode)
      .eq('is_active' as never, true)
      .limit(1);
    const rows = (data ?? []) as unknown as Array<{ is_active: boolean }>;
    isCertified = rows.length > 0;
  } catch {
    isCertified = false;
  }
  return { ...evaluation, is_certified: isCertified };
}
