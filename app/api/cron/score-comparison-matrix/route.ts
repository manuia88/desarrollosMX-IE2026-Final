// D16 FASE 10 — cron endpoint rebuild score_comparison_matrix daily.
// Ejecuta el mismo script lógica inline para evitar spawn de child process
// en Fluid Compute. Source of truth: scripts/score-comparison-matrix-rebuild.mjs.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const SCORES_TO_INCLUDE = [
  'F08',
  'F12',
  'H07',
  'A06',
  'A12',
  'B01',
  'B02',
  'H05',
  'H14',
  'F09',
  'F10',
  'B03',
  'B05',
  'B09',
  'B13',
  'H12',
  'H16',
];

const VALID_DAYS = 1;

interface ZoneScoreRow {
  readonly zone_id: string | null;
  readonly score_type: string;
  readonly score_value: number;
  readonly confidence: string;
  readonly period_date: string;
}

function buildMatrix(rows: readonly ZoneScoreRow[]) {
  const zoneSet = new Set<string>();
  const byZoneAndScore = new Map<
    string,
    { value: number; confidence: string; period_date: string }
  >();
  for (const r of rows) {
    if (!r.zone_id || !r.score_type) continue;
    if (!SCORES_TO_INCLUDE.includes(r.score_type)) continue;
    zoneSet.add(r.zone_id);
    byZoneAndScore.set(`${r.zone_id}::${r.score_type}`, {
      value: r.score_value,
      confidence: r.confidence,
      period_date: r.period_date,
    });
  }
  const zones = Array.from(zoneSet).sort();
  const matrix: Record<string, Record<string, unknown>> = {};
  for (const z of zones) {
    matrix[z] = {};
    for (const s of SCORES_TO_INCLUDE) {
      const key = `${z}::${s}`;
      const entry = byZoneAndScore.get(key);
      matrix[z][s] = entry ?? null;
    }
  }
  return { zones, scores: SCORES_TO_INCLUDE, matrix };
}

async function rebuildCountry(countryCode: string) {
  const admin = createAdminClient();
  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + VALID_DAYS);

  const { data, error } = await admin
    .from('zone_scores')
    .select('zone_id, score_type, score_value, confidence, period_date')
    .eq('country_code', countryCode)
    .in('score_type', SCORES_TO_INCLUDE);

  if (error) {
    return { ok: false, country: countryCode, error: error.message };
  }

  const { zones, scores, matrix } = buildMatrix((data ?? []) as unknown as ZoneScoreRow[]);
  if (zones.length === 0) {
    return { ok: true, country: countryCode, zones: 0 };
  }

  const row = {
    cluster_key: `${countryCode}:all`,
    country_code: countryCode,
    score_ids: scores,
    zone_ids: zones,
    matrix,
    computed_at: new Date().toISOString(),
    valid_until: validUntil.toISOString(),
    row_count: zones.length,
    col_count: scores.length,
  };

  const { error: upsertError } = await admin.from('score_comparison_matrix').upsert(row as never, {
    onConflict: 'cluster_key,country_code',
  });

  if (upsertError) {
    return { ok: false, country: countryCode, error: upsertError.message };
  }

  return { ok: true, country: countryCode, zones: zones.length, scores: scores.length };
}

export async function GET(request: Request) {
  const cronSecret = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || cronSecret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const countries = ['MX'];
  const results = [];
  for (const c of countries) {
    results.push(await rebuildCountry(c));
  }
  const anyFailed = results.some((r) => !r.ok);
  return NextResponse.json(
    { ok: !anyFailed, results, timestamp: new Date().toISOString() },
    { status: anyFailed ? 500 : 200 },
  );
}
