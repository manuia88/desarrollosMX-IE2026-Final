// BLOQUE 11.I.8 — Magnet vs Exodus ranking (consumer de zone_migration_flows).
//
// Agrega inflow/outflow por zona destino/origen para un período (trimestral o
// mensual) y produce top 10 magnets (net positivo) + top 10 exodus (net
// negativo). Incluye prose_md Forbes-style via proseHook inyectable (stub
// determinístico si no se provee).
//
// Consumer responsibility: proseHook caller must NOT pass forceRegenerate=true
// (cost budget).

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { MagnetExodusRanking, MagnetExodusRow, MagnetExodusTier } from '../types';

export type MagnetExodusProseHook = (prompt: string) => Promise<string>;

export interface BuildMagnetExodusOpts {
  readonly limit?: number;
  readonly proseHook?: MagnetExodusProseHook;
}

interface FlowRow {
  readonly origin_scope_id: string;
  readonly origin_scope_type: string;
  readonly dest_scope_id: string;
  readonly dest_scope_type: string;
  readonly volume: number;
}

interface ZoneAgg {
  zoneId: string;
  scopeType: 'colonia' | 'alcaldia';
  inflow: number;
  outflow: number;
}

// Pure helper: classify a zone by its net flow value.
export function classifyTier(netFlow: number): MagnetExodusTier {
  if (netFlow > 0) return 'magnet';
  if (netFlow < 0) return 'exodus';
  return 'neutral';
}

function coerceScopeType(raw: string): 'colonia' | 'alcaldia' | null {
  if (raw === 'colonia' || raw === 'alcaldia') return raw;
  return null;
}

async function fetchFlows(
  supabase: SupabaseClient<Record<string, unknown>>,
  countryCode: string,
  periodDate: string,
): Promise<readonly FlowRow[]> {
  const { data, error } = await supabase
    .from('zone_migration_flows' as never)
    .select('origin_scope_id, origin_scope_type, dest_scope_id, dest_scope_type, volume')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .in('origin_scope_type', ['colonia', 'alcaldia'])
    .in('dest_scope_type', ['colonia', 'alcaldia']);

  if (error) {
    console.warn('[magnet-exodus] fetchFlows error', { error });
    return [];
  }
  return (data ?? []) as readonly FlowRow[];
}

function aggregateByZone(rows: readonly FlowRow[]): Map<string, ZoneAgg> {
  const map = new Map<string, ZoneAgg>();

  for (const row of rows) {
    const originScope = coerceScopeType(row.origin_scope_type);
    const destScope = coerceScopeType(row.dest_scope_type);
    const volume = Number(row.volume) || 0;
    if (volume <= 0) continue;

    if (destScope !== null) {
      const key = `${destScope}:${row.dest_scope_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.inflow += volume;
      } else {
        map.set(key, {
          zoneId: row.dest_scope_id,
          scopeType: destScope,
          inflow: volume,
          outflow: 0,
        });
      }
    }

    if (originScope !== null) {
      const key = `${originScope}:${row.origin_scope_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.outflow += volume;
      } else {
        map.set(key, {
          zoneId: row.origin_scope_id,
          scopeType: originScope,
          inflow: 0,
          outflow: volume,
        });
      }
    }
  }

  return map;
}

function buildRows(
  aggs: Map<string, ZoneAgg>,
  countryCode: string,
  periodDate: string,
  tier: 'magnet' | 'exodus',
  limit: number,
): readonly MagnetExodusRow[] {
  const candidates = Array.from(aggs.values())
    .map((agg) => {
      const netFlow = agg.inflow - agg.outflow;
      const denom = agg.inflow + agg.outflow;
      const netFlowPct = denom === 0 ? 0 : netFlow / denom;
      return {
        zone_id: agg.zoneId,
        zone_label: agg.zoneId,
        scope_type: agg.scopeType,
        country_code: countryCode,
        period_date: periodDate,
        inflow: agg.inflow,
        outflow: agg.outflow,
        net_flow: netFlow,
        net_flow_pct: netFlowPct,
        tier: classifyTier(netFlow),
        rank: 0,
      };
    })
    .filter((r) => (tier === 'magnet' ? r.net_flow > 0 : r.net_flow < 0));

  candidates.sort((a, b) =>
    tier === 'magnet' ? b.net_flow - a.net_flow : a.net_flow - b.net_flow,
  );

  return candidates.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

function formatProsePrompt(params: {
  readonly countryCode: string;
  readonly periodDate: string;
  readonly topMagnets: readonly MagnetExodusRow[];
  readonly topExodus: readonly MagnetExodusRow[];
}): string {
  const m = params.topMagnets[0];
  const e = params.topExodus[0];
  return [
    `Redacta un párrafo editorial Forbes-style (es-MX, ~150 palabras) sobre el ranking Magnet vs Exodus ${params.countryCode} ${params.periodDate}.`,
    '',
    `- Top magnet: ${m ? `${m.zone_label} (+${m.net_flow})` : 'n/d'}`,
    `- Top exodus: ${e ? `${e.zone_label} (${e.net_flow})` : 'n/d'}`,
    '',
    'Reglas: tono editorial, cero hype, cita datos reales.',
  ].join('\n');
}

function buildStubProse(
  topMagnets: readonly MagnetExodusRow[],
  topExodus: readonly MagnetExodusRow[],
): string {
  const m = topMagnets[0];
  const e = topExodus[0];
  if (!m && !e) return 'Sin datos de flujo disponibles para este período.';
  const parts: string[] = [];
  if (m) {
    parts.push(
      `Este trimestre, **${m.zone_label}** lidera con ${m.net_flow} nuevos habitantes netos`,
    );
  }
  if (e) {
    parts.push(`mientras **${e.zone_label}** pierde ${Math.abs(e.net_flow)}`);
  }
  return `${parts.join(', ')}.`;
}

export async function buildMagnetExodusRanking(
  countryCode: string,
  periodDate: string,
  opts: BuildMagnetExodusOpts = {},
): Promise<MagnetExodusRanking> {
  const limit = opts.limit ?? 10;
  const supabase = createAdminClient();
  const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

  const flows = await fetchFlows(client, countryCode, periodDate);
  const aggs = aggregateByZone(flows);

  const topMagnets = buildRows(aggs, countryCode, periodDate, 'magnet', limit);
  const topExodus = buildRows(aggs, countryCode, periodDate, 'exodus', limit);

  let proseMd: string | null = buildStubProse(topMagnets, topExodus);
  if (opts.proseHook) {
    const prompt = formatProsePrompt({
      countryCode,
      periodDate,
      topMagnets,
      topExodus,
    });
    try {
      proseMd = await opts.proseHook(prompt);
    } catch (err) {
      console.warn('[magnet-exodus] proseHook error', { err });
      // keep stub
    }
  }

  return {
    country_code: countryCode,
    period_date: periodDate,
    top_magnets: topMagnets,
    top_exodus: topExodus,
    prose_md: proseMd,
  };
}

export { buildStubProse, formatProsePrompt };
