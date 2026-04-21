// FASE 11.J.5 — Migration Wrapped (sub-card set integrable en DMX Wrapped).
//
// Agrega top_magnet (mayor net flow entrante positivo) + top_exodus (mayor
// net flow saliente negativo) + total_flows anual. Genera cards listos para
// embed como sección "Migration" dentro del Wrapped main (page
// /wrapped/YYYY).

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { MigrationWrappedBundle, WrappedCard } from '../types';

type Supabase = SupabaseClient<Database>;

export interface BuildMigrationWrappedOpts {
  readonly year: number;
  readonly countryCode: string;
  readonly supabase?: Supabase;
}

interface FlowRow {
  readonly origin_scope_type: string;
  readonly origin_scope_id: string;
  readonly dest_scope_type: string;
  readonly dest_scope_id: string;
  readonly volume: number;
}

interface NetEntry {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly net: number;
  readonly inflow: number;
  readonly outflow: number;
}

function computeNetFlows(rows: readonly FlowRow[]): Map<string, NetEntry> {
  const map = new Map<string, NetEntry>();
  const get = (k: string): NetEntry | undefined => map.get(k);

  for (const r of rows) {
    const destKey = `${r.dest_scope_type}:${r.dest_scope_id}`;
    const originKey = `${r.origin_scope_type}:${r.origin_scope_id}`;

    const destCur = get(destKey) ?? {
      scope_type: r.dest_scope_type,
      scope_id: r.dest_scope_id,
      net: 0,
      inflow: 0,
      outflow: 0,
    };
    map.set(destKey, {
      scope_type: destCur.scope_type,
      scope_id: destCur.scope_id,
      inflow: destCur.inflow + r.volume,
      outflow: destCur.outflow,
      net: destCur.net + r.volume,
    });

    const originCur = get(originKey) ?? {
      scope_type: r.origin_scope_type,
      scope_id: r.origin_scope_id,
      net: 0,
      inflow: 0,
      outflow: 0,
    };
    map.set(originKey, {
      scope_type: originCur.scope_type,
      scope_id: originCur.scope_id,
      inflow: originCur.inflow,
      outflow: originCur.outflow + r.volume,
      net: originCur.net - r.volume,
    });
  }

  return map;
}

export async function buildMigrationWrapped(
  opts: BuildMigrationWrappedOpts,
): Promise<MigrationWrappedBundle> {
  const supabase = opts.supabase ?? createAdminClient();

  const { data } = await supabase
    .from('zone_migration_flows')
    .select('origin_scope_type,origin_scope_id,dest_scope_type,dest_scope_id,volume')
    .eq('country_code', opts.countryCode)
    .gte('period_date', `${opts.year}-01-01`)
    .lte('period_date', `${opts.year}-12-31`);

  const rows = (data ?? []) as ReadonlyArray<FlowRow>;
  const nets = computeNetFlows(rows);
  const entries = Array.from(nets.values());

  const topMagnetEntry = entries.reduce<NetEntry | null>(
    (best, cur) => (best === null || cur.net > best.net ? cur : best),
    null,
  );
  const topExodusEntry = entries.reduce<NetEntry | null>(
    (worst, cur) => (worst === null || cur.net < worst.net ? cur : worst),
    null,
  );

  const totalVolume = rows.reduce((acc, r) => acc + r.volume, 0);

  const magnetLabel = topMagnetEntry
    ? resolveZoneLabelSync({
        scopeType: topMagnetEntry.scope_type,
        scopeId: topMagnetEntry.scope_id,
      })
    : '—';
  const exodusLabel = topExodusEntry
    ? resolveZoneLabelSync({
        scopeType: topExodusEntry.scope_type,
        scopeId: topExodusEntry.scope_id,
      })
    : '—';

  const cards: WrappedCard[] = [];
  if (topMagnetEntry) {
    cards.push({
      kind: 'top_migration_destination',
      title: 'Top imán del año',
      value: magnetLabel,
      subtext: `Neto +${topMagnetEntry.net.toLocaleString('es-MX')}`,
      emoji: '🧲',
      share_png_url: null,
    });
  }
  if (topExodusEntry) {
    cards.push({
      kind: 'top_migration_origin',
      title: 'Mayor éxodo del año',
      value: exodusLabel,
      subtext: `Neto ${topExodusEntry.net.toLocaleString('es-MX')}`,
      emoji: '🚪',
      share_png_url: null,
    });
  }
  cards.push({
    kind: 'zone_visited_count',
    title: 'Volumen total migratorio',
    value: totalVolume.toLocaleString('es-MX'),
    subtext: `${opts.year}`,
    emoji: '🌊',
    share_png_url: null,
  });

  return {
    year: opts.year,
    country_code: opts.countryCode,
    top_magnet: {
      scope_id: topMagnetEntry?.scope_id ?? '',
      zone_label: magnetLabel,
      net: topMagnetEntry?.net ?? 0,
    },
    top_exodus: {
      scope_id: topExodusEntry?.scope_id ?? '',
      zone_label: exodusLabel,
      net: topExodusEntry?.net ?? 0,
    },
    total_flows: totalVolume,
    cards,
  };
}
