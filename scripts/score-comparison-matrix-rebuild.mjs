#!/usr/bin/env node
// D16 FASE 10 — rebuild score_comparison_matrix daily.
// Queries zone_scores agrupa por país, toma N2 + core N1 scores, arma matriz
// NxM (zones × scores) y UPSERTa con cluster_key = `${country_code}:all`.
// H1 simplificación: un solo cluster por país (all zones together). H2 separa
// por similitud geográfica / socioeconómica.
//
// Ejecución: vercel.json cron daily 3am UTC = 9pm CDMX.
// Consumer: A08 Comparador Multi-D (sesión 2/3) lee de aquí.

import { createClient } from '@supabase/supabase-js';

const SCORES_TO_INCLUDE = [
  // Core N1
  'F08', 'F12', 'H07', 'A06', 'A12', 'B01', 'B02', 'H05', 'H14',
  // N2 de interés A08 comparador (8 dimensions N3)
  'F09', 'F10', 'B03', 'B05', 'B09', 'B13', 'H12', 'H16',
];

const VALID_DAYS = 1;

function buildMatrix(rows) {
  const zoneSet = new Set();
  const byZoneAndScore = new Map();
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
  const matrix = {};
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

async function rebuildCountry(admin, countryCode) {
  const today = new Date().toISOString().slice(0, 10);
  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + VALID_DAYS);

  const { data, error } = await admin
    .from('zone_scores')
    .select('zone_id, score_type, score_value, confidence, period_date')
    .eq('country_code', countryCode)
    .in('score_type', SCORES_TO_INCLUDE);

  if (error) {
    console.error(`[${countryCode}] fetch error:`, error.message);
    return { ok: false, error: error.message };
  }

  const { zones, scores, matrix } = buildMatrix(data ?? []);
  if (zones.length === 0) {
    console.log(`[${countryCode}] no data, skip`);
    return { ok: true, zones: 0 };
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

  const { error: upsertError } = await admin
    .from('score_comparison_matrix')
    .upsert(row, { onConflict: 'cluster_key,country_code' });

  if (upsertError) {
    console.error(`[${countryCode}] upsert error:`, upsertError.message);
    return { ok: false, error: upsertError.message };
  }

  console.log(
    `[${countryCode}] matrix ${zones.length}×${scores.length} rebuilt, valid until ${validUntil.toISOString()}`,
  );
  return { ok: true, zones: zones.length, scores: scores.length };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const countries = ['MX'];
  const results = [];
  for (const c of countries) {
    results.push(await rebuildCountry(admin, c));
  }

  const anyFailed = results.some((r) => !r.ok);
  if (anyFailed) process.exit(2);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
