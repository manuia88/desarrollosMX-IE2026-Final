import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  BENCHMARK_METRICS,
  type BenchmarkMetric,
  runBenchmarkEngine,
} from '@/shared/lib/upg/benchmark-engine';

export const maxDuration = 300;

function currentQuarter(): { quarter: string; from: string; to: string } {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  const year = d.getFullYear();
  const fromMonth = (q - 1) * 3;
  const toMonth = fromMonth + 3;
  const from = `${year}-${String(fromMonth + 1).padStart(2, '0')}-01`;
  const to =
    toMonth >= 12 ? `${year + 1}-01-01` : `${year}-${String(toMonth + 1).padStart(2, '0')}-01`;
  return { quarter: `${year}-Q${q}`, from, to };
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function computeMetricForDeveloper(
  supabase: AdminClient,
  desarrolladoraId: string,
  metric: BenchmarkMetric,
  range: { from: string; to: string },
): Promise<number> {
  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('units_total, units_available, price_min_mxn, price_max_mxn, created_at')
    .eq('desarrolladora_id', desarrolladoraId)
    .eq('is_active', true);
  const list = proyectos ?? [];
  if (list.length === 0) return 0;

  if (metric === 'absorption_rate_monthly') {
    const sold = list.reduce(
      (acc, p) => acc + Math.max(0, (p.units_total ?? 0) - (p.units_available ?? 0)),
      0,
    );
    const months = Math.max(
      1,
      Math.round((Date.parse(range.to) - Date.parse(range.from)) / (1000 * 60 * 60 * 24 * 30.44)) *
        list.length,
    );
    return Number((sold / months).toFixed(4));
  }
  if (metric === 'price_per_m2_avg_mxn') {
    let acc = 0;
    let n = 0;
    for (const p of list) {
      const lo = Number(p.price_min_mxn ?? 0);
      const hi = Number(p.price_max_mxn ?? lo);
      if (lo > 0 && hi > 0) {
        acc += (lo + hi) / 2 / 80;
        n++;
      }
    }
    return n > 0 ? Number((acc / n).toFixed(2)) : 0;
  }
  if (metric === 'days_to_sell_avg') {
    const ages = list
      .map((p) => {
        const created = p.created_at ? Date.parse(p.created_at) : Date.now();
        const sold = (p.units_total ?? 0) - (p.units_available ?? 0);
        if (sold <= 0) return null;
        return (Date.now() - created) / (1000 * 60 * 60 * 24) / sold;
      })
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (ages.length === 0) return 0;
    const sum = ages.reduce((acc, v) => acc + v, 0);
    return Number((sum / ages.length).toFixed(2));
  }
  if (metric === 'units_delivered_on_time_pct') {
    const sold = list.reduce(
      (acc, p) => acc + Math.max(0, (p.units_total ?? 0) - (p.units_available ?? 0)),
      0,
    );
    const total = list.reduce((acc, p) => acc + (p.units_total ?? 0), 0);
    return total > 0 ? Number(((sold / total) * 100).toFixed(2)) : 0;
  }
  return 0;
}

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase = createAdminClient();
  const { quarter, from, to } = currentQuarter();

  const runIngest = await supabase
    .from('ingest_runs')
    .insert({
      source: 'developer-benchmarks-quarterly',
      country_code: 'MX',
      status: 'running',
      started_at: new Date().toISOString(),
      triggered_by: 'cron',
    })
    .select('id')
    .single();
  const runId: string | null = runIngest.data?.id ?? null;

  let inserted = 0;
  let processed = 0;
  let errors = 0;

  try {
    const { data: developers } = await supabase
      .from('desarrolladoras')
      .select('id, country_code')
      .eq('is_active', true);
    const list = developers ?? [];

    const cohortByCountry = new Map<string, string[]>();
    for (const d of list) {
      const cc = String(d.country_code);
      const arr = cohortByCountry.get(cc) ?? [];
      arr.push(d.id);
      cohortByCountry.set(cc, arr);
    }

    for (const dev of list) {
      processed++;
      const cohortIds = cohortByCountry.get(String(dev.country_code)) ?? [];
      try {
        for (const metric of BENCHMARK_METRICS) {
          const myValue = await computeMetricForDeveloper(supabase, dev.id, metric, {
            from,
            to,
          });
          const cohortValues: { desarrolladoraId: string; value: number }[] = [];
          for (const peerId of cohortIds) {
            if (peerId === dev.id) continue;
            const v = await computeMetricForDeveloper(supabase, peerId, metric, {
              from,
              to,
            });
            if (v > 0) cohortValues.push({ desarrolladoraId: peerId, value: v });
          }
          const result = runBenchmarkEngine({ metric, value: myValue, cohort: cohortValues });
          await supabase.from('developer_benchmarks').upsert(
            {
              desarrolladora_id: dev.id,
              period_quarter: quarter,
              metric,
              value: result.value,
              percentile: result.percentile,
              cohort_size: result.cohortSize,
              cohort_median: result.cohortMedian,
              cohort_top10: result.cohortTop10,
              cohort_top25: result.cohortTop25,
              computed_at: new Date().toISOString(),
            },
            { onConflict: 'desarrolladora_id,period_quarter,metric' },
          );
          inserted++;
        }
      } catch {
        errors++;
      }
    }

    if (runId) {
      await supabase
        .from('ingest_runs')
        .update({
          status: errors > 0 ? 'partial' : 'success',
          completed_at: new Date().toISOString(),
          rows_inserted: inserted,
          rows_updated: processed,
          duration_ms: Date.now() - startedAt,
        })
        .eq('id', runId);
    }

    return NextResponse.json({
      ok: true,
      quarter,
      developers: processed,
      benchmarks_inserted: inserted,
      errors,
      duration_ms: Date.now() - startedAt,
    });
  } catch (err) {
    if (runId) {
      await supabase
        .from('ingest_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'unknown',
          duration_ms: Date.now() - startedAt,
        })
        .eq('id', runId);
    }
    return NextResponse.json(
      { error: 'cron_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
