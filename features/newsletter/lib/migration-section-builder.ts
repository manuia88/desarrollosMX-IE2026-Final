// features/newsletter/lib/migration-section-builder.ts
//
// BLOQUE 11.J.9 — Newsletter × Migration Flow section.
// Construye un bundle con top 3 origins + top 3 destinations del scope para
// insertar en el newsletter mensual personalizado por zona.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MigrationFlowEntry, MigrationSectionBundle } from '@/features/newsletter/types';
import {
  batchResolveZoneLabels,
  resolveZoneLabelSync,
  type ZoneScopeType,
} from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const DEFAULT_SITE_URL = 'https://desarrollosmx.com';
const TOP_LIMIT = 3;

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return DEFAULT_SITE_URL;
}

function buildFlowsDetailUrl(locale: string, scopeId: string): string {
  const base = resolveSiteUrl().replace(/\/$/, '');
  const qs = new URLSearchParams({ zona: scopeId }).toString();
  return `${base}/${locale}/indices/flujos?${qs}`;
}

export interface BuildMigrationSectionInput {
  readonly scopeId: string;
  readonly scopeType?: ZoneScopeType;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly locale?: string;
  readonly supabase?: SupabaseClient<Record<string, unknown>>;
}

interface FlowRow {
  readonly origin_scope_type: string;
  readonly origin_scope_id: string;
  readonly dest_scope_type: string;
  readonly dest_scope_id: string;
  readonly volume: number;
}

export async function buildMigrationSection(
  input: BuildMigrationSectionInput,
): Promise<MigrationSectionBundle> {
  const { scopeId, countryCode, periodDate } = input;
  const scopeType: ZoneScopeType = input.scopeType ?? 'colonia';
  const locale = input.locale ?? 'es-MX';
  const client = (input.supabase ?? createAdminClient()) as unknown as SupabaseClient<
    Record<string, unknown>
  >;

  const zoneLabel = resolveZoneLabelSync({ scopeType, scopeId });
  const detailUrl = buildFlowsDetailUrl(locale, scopeId);

  // Inflows: origin→scopeId.
  const [inflowsRes, outflowsRes] = await Promise.all([
    client
      .from('zone_migration_flows' as never)
      .select('origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, volume')
      .eq('country_code', countryCode)
      .eq('period_date', periodDate)
      .eq('dest_scope_id', scopeId)
      .order('volume', { ascending: false })
      .limit(TOP_LIMIT),
    client
      .from('zone_migration_flows' as never)
      .select('origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, volume')
      .eq('country_code', countryCode)
      .eq('period_date', periodDate)
      .eq('origin_scope_id', scopeId)
      .order('volume', { ascending: false })
      .limit(TOP_LIMIT),
  ]);

  const inflowRows = (inflowsRes.data as ReadonlyArray<FlowRow> | null) ?? [];
  const outflowRows = (outflowsRes.data as ReadonlyArray<FlowRow> | null) ?? [];

  if (inflowsRes.error !== null || outflowsRes.error !== null) {
    return {
      scope_id: scopeId,
      zone_label: zoneLabel,
      top_origins: [],
      top_destinations: [],
      detail_url: detailUrl,
    };
  }

  const totalInflowVolume = inflowRows.reduce((acc, r) => acc + (r.volume ?? 0), 0);
  const totalOutflowVolume = outflowRows.reduce((acc, r) => acc + (r.volume ?? 0), 0);

  // Batch-resolve labels for every origin + destination referenced.
  const labelTargets = [
    ...inflowRows.map((r) => ({
      scopeType: r.origin_scope_type as ZoneScopeType,
      scopeId: r.origin_scope_id,
      countryCode,
    })),
    ...outflowRows.map((r) => ({
      scopeType: r.dest_scope_type as ZoneScopeType,
      scopeId: r.dest_scope_id,
      countryCode,
    })),
  ];
  // Cast to the Database-typed SupabaseClient expected by batchResolveZoneLabels.
  // The client is the same underlying admin client (service role), just without
  // the generic parameter locked at compile time from our Record-based cast.
  const resolvedLabels = await batchResolveZoneLabels(labelTargets);

  const topOrigins: MigrationFlowEntry[] = inflowRows.map((r, idx) => ({
    scope_id: r.origin_scope_id,
    zone_label:
      resolvedLabels[idx] ??
      resolveZoneLabelSync({ scopeType: r.origin_scope_type, scopeId: r.origin_scope_id }),
    volume: r.volume ?? 0,
    share_pct:
      totalInflowVolume > 0 ? Math.round(((r.volume ?? 0) / totalInflowVolume) * 10_000) / 100 : 0,
  }));

  const outflowOffset = inflowRows.length;
  const topDestinations: MigrationFlowEntry[] = outflowRows.map((r, idx) => ({
    scope_id: r.dest_scope_id,
    zone_label:
      resolvedLabels[outflowOffset + idx] ??
      resolveZoneLabelSync({ scopeType: r.dest_scope_type, scopeId: r.dest_scope_id }),
    volume: r.volume ?? 0,
    share_pct:
      totalOutflowVolume > 0
        ? Math.round(((r.volume ?? 0) / totalOutflowVolume) * 10_000) / 100
        : 0,
  }));

  return {
    scope_id: scopeId,
    zone_label: zoneLabel,
    top_origins: topOrigins,
    top_destinations: topDestinations,
    detail_url: detailUrl,
  };
}
