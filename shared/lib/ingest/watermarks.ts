import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface Watermark {
  source: string;
  countryCode: string;
  lastSuccessfulRunId: string | null;
  lastSuccessfulPeriodEnd: string | null;
  lastSuccessfulAt: string | null;
  expectedPeriodicity: string | null;
  alertAfterHours: number;
}

export async function getWatermark(source: string): Promise<Watermark | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ingest_watermarks')
    .select(
      'source, country_code, last_successful_run_id, last_successful_period_end, last_successful_at, expected_periodicity, alert_after_hours',
    )
    .eq('source', source)
    .maybeSingle();
  if (error || !data) return null;
  return {
    source: data.source,
    countryCode: data.country_code,
    lastSuccessfulRunId: data.last_successful_run_id,
    lastSuccessfulPeriodEnd: data.last_successful_period_end,
    lastSuccessfulAt: data.last_successful_at,
    expectedPeriodicity: data.expected_periodicity,
    alertAfterHours: data.alert_after_hours ?? 48,
  };
}

export async function bumpWatermark(opts: {
  source: string;
  countryCode: string;
  runId: string;
  periodEnd: string;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('ingest_watermarks').upsert(
    {
      source: opts.source,
      country_code: opts.countryCode,
      last_successful_run_id: opts.runId,
      last_successful_period_end: opts.periodEnd,
      last_successful_at: new Date().toISOString(),
    },
    { onConflict: 'source' },
  );
}
