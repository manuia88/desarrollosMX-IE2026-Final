// BLOQUE 11.N.4 — Newsletter × Futures Curve section builder.
//
// Construye FuturesSectionBundle para email monthly: lee la última
// proyección persistida en futures_curve_projections para la zona suscrita
// + indexCode dado, devuelve 3/6/12m con banda CI 95% (_lower/_upper columns
// añadidas en 20260423110000).
//
// Si no hay proyección fresca → devuelve null (caller skipea la sección).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FuturesSectionBundle, FuturesSectionForwardPoint } from '@/features/newsletter/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

const DEFAULT_SITE_URL = 'https://desarrollosmx.com';
const DEFAULT_LOCALE = 'es-MX';
const DEFAULT_INDEX_CODE = 'DMX-LIV';

export interface BuildFuturesSectionOptions {
  readonly scopeId: string;
  readonly countryCode: string;
  readonly scopeType?: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly indexCode?: string;
  readonly locale?: string;
  readonly siteUrl?: string;
  readonly supabase?: SupabaseClient<Database>;
}

export async function buildFuturesSection(
  opts: BuildFuturesSectionOptions,
): Promise<FuturesSectionBundle | null> {
  const supabase = opts.supabase ?? createAdminClient();
  const indexCode = opts.indexCode ?? DEFAULT_INDEX_CODE;
  const scopeType = opts.scopeType ?? 'colonia';
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const siteUrl = opts.siteUrl ?? DEFAULT_SITE_URL;

  const { data, error } = await supabase
    .from('futures_curve_projections')
    .select(
      'forward_3m, forward_3m_lower, forward_3m_upper, forward_6m, forward_6m_lower, forward_6m_upper, forward_12m, forward_12m_lower, forward_12m_upper',
    )
    .eq('index_code', indexCode)
    .eq('scope_type', scopeType)
    .eq('scope_id', opts.scopeId)
    .eq('country_code', opts.countryCode)
    .order('base_period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const toNum = (x: unknown): number | null => (typeof x === 'number' ? x : null);

  const points: FuturesSectionForwardPoint[] = [
    {
      horizon_m: 3,
      value: toNum(data.forward_3m),
      lower: toNum(data.forward_3m_lower),
      upper: toNum(data.forward_3m_upper),
    },
    {
      horizon_m: 6,
      value: toNum(data.forward_6m),
      lower: toNum(data.forward_6m_lower),
      upper: toNum(data.forward_6m_upper),
    },
    {
      horizon_m: 12,
      value: toNum(data.forward_12m),
      lower: toNum(data.forward_12m_lower),
      upper: toNum(data.forward_12m_upper),
    },
  ];

  const anyValue = points.some((p) => p.value !== null);
  if (!anyValue) return null;

  const zoneLabel = await resolveZoneLabel({
    scopeType,
    scopeId: opts.scopeId,
    countryCode: opts.countryCode,
    supabase,
  });

  return {
    scope_id: opts.scopeId,
    zone_label: zoneLabel,
    index_code: indexCode,
    points,
    detail_url: `${siteUrl}/${locale}/indices/${indexCode}/futuros?scope_ids=${encodeURIComponent(opts.scopeId)}`,
  };
}
