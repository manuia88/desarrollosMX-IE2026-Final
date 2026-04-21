// features/newsletter/lib/streaks-section-builder.ts
//
// BLOQUE 11.J.4 — Sección newsletter "Las más vivas este trimestre" (top 10
// zonas con mayor racha consecutiva de pulse > 80). Consume zone_streaks
// directamente (upserted por streaks-calculator desde el cron maestro).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StreaksSectionBundle, ZoneStreakRow } from '@/features/newsletter/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import { computeZoneStreaks, STREAK_TOP_LIMIT } from './streaks-calculator';

export interface BuildStreaksSectionInput {
  readonly countryCode: string;
  readonly periodDate: string;
  readonly locale?: string;
  readonly supabase?: SupabaseClient<Database>;
}

const DEFAULT_SITE_URL = 'https://desarrollosmx.com';

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return DEFAULT_SITE_URL;
}

function buildStreaksDetailUrl(locale: string): string {
  const base = resolveSiteUrl().replace(/\/$/, '');
  return `${base}/${locale}/indices/streaks`;
}

export async function buildStreaksSection(
  input: BuildStreaksSectionInput,
): Promise<StreaksSectionBundle> {
  const { countryCode, periodDate } = input;
  const locale = input.locale ?? 'es-MX';
  const client = input.supabase ?? createAdminClient();
  const rawClient = client as unknown as SupabaseClient<Record<string, unknown>>;

  // Try to read from zone_streaks first; if missing for this period, compute
  // on-the-fly as graceful fallback (same contract as the public page).
  const { data, error } = await rawClient
    .from('zone_streaks' as never)
    .select(
      'id, country_code, scope_type, scope_id, period_date, streak_length_months, current_pulse, rank_in_country, computed_at',
    )
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .order('rank_in_country', { ascending: true })
    .limit(STREAK_TOP_LIMIT);

  let topStreaks: ReadonlyArray<ZoneStreakRow> = [];
  if (!error && Array.isArray(data) && data.length > 0) {
    topStreaks = data as ReadonlyArray<ZoneStreakRow>;
  } else {
    try {
      topStreaks = await computeZoneStreaks({
        countryCode,
        periodDate,
        supabase: client,
      });
    } catch {
      topStreaks = [];
    }
  }

  return {
    period_date: periodDate,
    top_streaks: topStreaks,
    detail_url: buildStreaksDetailUrl(locale),
  };
}
