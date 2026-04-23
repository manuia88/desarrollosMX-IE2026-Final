// BLOQUE 11.P.4 — Cross-function Climate × Pulse.
//
// checkClimateAnomalyImpactOnPulse: si el mes actual de una zona tiene
// más eventos extremos que el umbral, ajustar pulse_score temporalmente
// para reflejar el impacto climático sobre la calidad de vida.
//
// Determinístico H1: umbral fijo 1 evento extremo → -5% pulse relative.
// Upgrade H2 (L140): modelo ML de impacto por tipo de evento.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

const ADJUSTMENT_PCT = -5;

export interface ClimatePulseAdjustment {
  readonly zone_id: string;
  readonly pulse_base: number;
  readonly pulse_adjusted: number;
  readonly extreme_events_month: number;
  readonly year_month: string;
  readonly reason: 'ok' | 'extreme_events';
}

export async function checkClimateAnomalyImpactOnPulse(params: {
  readonly zoneId: string;
  readonly pulseBase: number;
  readonly supabase: SupabaseClient<Database>;
  readonly referenceYearMonth?: string;
}): Promise<ClimatePulseAdjustment> {
  const { zoneId, pulseBase, supabase } = params;
  const yearMonth = params.referenceYearMonth ?? currentYearMonthIso();

  const { data: row } = await supabase
    .from('climate_monthly_aggregates')
    .select('year_month, extreme_events_count')
    .eq('zone_id', zoneId)
    .eq('year_month', yearMonth)
    .maybeSingle();

  if (!row) {
    return {
      zone_id: zoneId,
      pulse_base: pulseBase,
      pulse_adjusted: pulseBase,
      extreme_events_month: 0,
      year_month: yearMonth,
      reason: 'ok',
    };
  }

  const events = row.extreme_events_count as Record<string, number> | null;
  const total = events
    ? Object.values(events).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
    : 0;

  if (total < 1) {
    return {
      zone_id: zoneId,
      pulse_base: pulseBase,
      pulse_adjusted: pulseBase,
      extreme_events_month: 0,
      year_month: yearMonth,
      reason: 'ok',
    };
  }

  const adjusted = Math.max(0, Math.min(100, pulseBase * (1 + ADJUSTMENT_PCT / 100)));
  return {
    zone_id: zoneId,
    pulse_base: pulseBase,
    pulse_adjusted: Math.round(adjusted * 100) / 100,
    extreme_events_month: total,
    year_month: yearMonth,
    reason: 'extreme_events',
  };
}

function currentYearMonthIso(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
