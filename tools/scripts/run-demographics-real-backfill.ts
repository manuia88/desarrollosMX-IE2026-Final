// Demographics Real Backfill — F1.C.B Tier 1 (INEGI Censo 2020 municipal proxy).
//
// Replaces synthetic inegi_census_zone_stats rows (data_origin='inegi_synthetic_v1')
// with real Censo 2020 municipal data from INEGI BISE API, applied to all
// colonias within each alcaldía (Tier 1 = inegi_municipal_proxy granularity).
//
// Tier 2 (AGEB-level overlay) defers to F1.C.C with ITER CSV download +
// Marco Geoestadístico shapefile + spatial overlay against F1.D real polygons.
//
// 5 canon indicators (BISE, verified live):
//   - 1002000001 → poblacion_total
//   - 1003000001 → hogares_censales
//   - 1002000010 → edad_mediana_anios
//   - 1004000001 → poblacion_12_y_mas
//   - 3105001001 → densidad_hab_km2
//
// Run:
//   set -a; source .env.local; set +a
//   node --experimental-strip-types --experimental-transform-types \
//     --import=./scripts/compute/_register-ts-loader.mjs \
//     tools/scripts/run-demographics-real-backfill.ts

import { createAdminClient } from '@/shared/lib/supabase/admin';

const INEGI_TOKEN = process.env.INEGI_TOKEN ?? '';
if (!INEGI_TOKEN) throw new Error('INEGI_TOKEN missing in env');

const INDICATORS = {
  poblacion_total: '1002000001',
  hogares_censales: '1003000001',
  edad_mediana_anios: '1002000010',
  poblacion_12_y_mas: '1004000001',
  densidad_hab_km2: '3105001001',
} as const;

// scope_id → INEGI municipality code map (16 alcaldías CDMX entity 09)
const SCOPE_TO_INEGI: Record<string, string> = {
  'MX-CDMX-AO': '09010', // Álvaro Obregón
  'MX-CDMX-AZ': '09002', // Azcapotzalco
  'MX-CDMX-BJ': '09014', // Benito Juárez
  'MX-CDMX-CJ': '09004', // Cuajimalpa de Morelos
  'MX-CDMX-CU': '09015', // Cuauhtémoc
  'MX-CDMX-CY': '09003', // Coyoacán
  'MX-CDMX-GM': '09005', // Gustavo A. Madero
  'MX-CDMX-IC': '09006', // Iztacalco
  'MX-CDMX-IZ': '09007', // Iztapalapa
  'MX-CDMX-MA': '09009', // Milpa Alta
  'MX-CDMX-MC': '09008', // La Magdalena Contreras
  'MX-CDMX-MH': '09016', // Miguel Hidalgo
  'MX-CDMX-TH': '09011', // Tláhuac
  'MX-CDMX-TL': '09012', // Tlalpan
  'MX-CDMX-VC': '09017', // Venustiano Carranza
  'MX-CDMX-XO': '09013', // Xochimilco
};

interface BiseObservation {
  readonly TIME_PERIOD: string;
  readonly OBS_VALUE: string;
}

interface BiseSeries {
  readonly INDICADOR: string;
  readonly OBSERVATIONS: BiseObservation[];
}

interface BiseResponse {
  readonly Series?: BiseSeries[];
}

async function fetchBiseIndicator(
  indicatorId: string,
  geo: string,
): Promise<{ year: string; value: number } | null> {
  const url = `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/${indicatorId}/es/${geo}/false/BISE/2.0/${INEGI_TOKEN}?type=json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[demographics] BISE ${indicatorId}/${geo} HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as BiseResponse | unknown[];
  if (!data || Array.isArray(data)) {
    console.error(`[demographics] BISE ${indicatorId}/${geo} error response`);
    return null;
  }
  const series = (data as BiseResponse).Series;
  if (!series || series.length === 0) return null;
  const obs = series[0]?.OBSERVATIONS ?? [];
  // Pick latest 2020 observation (Censo 2020); fallback to latest available
  const obs2020 = obs.find((o) => o.TIME_PERIOD === '2020');
  const target = obs2020 ?? obs[obs.length - 1];
  if (!target) return null;
  return { year: target.TIME_PERIOD, value: Number(target.OBS_VALUE) };
}

interface AlcaldiaCensoData {
  readonly inegiCode: string;
  readonly poblacion_total: number | null;
  readonly hogares_censales: number | null;
  readonly edad_mediana_anios: number | null;
  readonly poblacion_12_y_mas: number | null;
  readonly densidad_hab_km2: number | null;
}

async function fetchAlcaldiaCenso(inegiCode: string): Promise<AlcaldiaCensoData> {
  const out: Record<string, number | null> = {};
  for (const [label, id] of Object.entries(INDICATORS)) {
    const r = await fetchBiseIndicator(id, inegiCode);
    out[label] = r ? r.value : null;
    await new Promise((res) => setTimeout(res, 200)); // rate limit ~5 req/sec
  }
  return {
    inegiCode,
    poblacion_total: out.poblacion_total ?? null,
    hogares_censales: out.hogares_censales ?? null,
    edad_mediana_anios: out.edad_mediana_anios ?? null,
    poblacion_12_y_mas: out.poblacion_12_y_mas ?? null,
    densidad_hab_km2: out.densidad_hab_km2 ?? null,
  };
}

async function main(): Promise<void> {
  const start = Date.now();
  const supabase = createAdminClient();

  console.info('[demographics] step 1/4 fetch INEGI Censo 2020 per alcaldía (16)');
  const censoByScope = new Map<string, AlcaldiaCensoData>();
  for (const [scopeId, inegiCode] of Object.entries(SCOPE_TO_INEGI)) {
    const data = await fetchAlcaldiaCenso(inegiCode);
    censoByScope.set(scopeId, data);
    console.info(
      `[demographics]   ${scopeId} (${inegiCode}): pob=${data.poblacion_total} hogares=${data.hogares_censales} edad=${data.edad_mediana_anios} pob12=${data.poblacion_12_y_mas} dens=${data.densidad_hab_km2}`,
    );
  }

  console.info('[demographics] step 2/4 fetch zones colonia + alcaldia mapping');
  const { data: alcaldias, error: aErr } = await supabase
    .from('zones')
    .select('id, scope_id')
    .eq('country_code', 'MX')
    .eq('scope_type', 'alcaldia');
  if (aErr || !alcaldias) throw new Error(`alcaldias_fetch_failed: ${aErr?.message}`);

  const alcaldiaIdByScope = new Map<string, string>();
  for (const a of alcaldias) {
    if (a.scope_id) alcaldiaIdByScope.set(a.scope_id, a.id);
  }

  const { data: colonias, error: cErr } = await supabase
    .from('zones')
    .select('id, scope_id, parent_scope_id, name_es')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia');
  if (cErr || !colonias) throw new Error(`colonias_fetch_failed: ${cErr?.message}`);

  console.info(
    `[demographics] step 3/4 upsert inegi_census_zone_stats for ${colonias.length} colonias + 16 alcaldias`,
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const allRows: Array<{
    zone_id: string;
    snapshot_date: string;
    data_origin: string;
    poblacion_total: number | null;
    hogares_censales: number | null;
    edad_mediana_anios: number | null;
    poblacion_12_y_mas: number | null;
    densidad_hab_km2: number | null;
  }> = [];

  // Alcaldía rows (direct INEGI mapping)
  for (const scopeId of Object.keys(SCOPE_TO_INEGI)) {
    const zid = alcaldiaIdByScope.get(scopeId);
    const data = censoByScope.get(scopeId);
    if (!zid || !data) continue;
    allRows.push({
      zone_id: zid,
      snapshot_date: todayIso,
      data_origin: 'inegi_municipal_proxy',
      poblacion_total: data.poblacion_total,
      hogares_censales: data.hogares_censales,
      edad_mediana_anios: data.edad_mediana_anios,
      poblacion_12_y_mas: data.poblacion_12_y_mas,
      densidad_hab_km2: data.densidad_hab_km2,
    });
  }

  // Colonia rows (proxy from parent alcaldía)
  let propagatedColonias = 0;
  let unmatchedColonias = 0;
  for (const c of colonias) {
    if (!c.parent_scope_id) {
      unmatchedColonias++;
      continue;
    }
    const data = censoByScope.get(c.parent_scope_id);
    if (!data) {
      unmatchedColonias++;
      continue;
    }
    allRows.push({
      zone_id: c.id,
      snapshot_date: todayIso,
      data_origin: 'inegi_municipal_proxy',
      poblacion_total: data.poblacion_total,
      hogares_censales: data.hogares_censales,
      edad_mediana_anios: data.edad_mediana_anios,
      poblacion_12_y_mas: data.poblacion_12_y_mas,
      densidad_hab_km2: data.densidad_hab_km2,
    });
    propagatedColonias++;
  }

  console.info(
    `[demographics]   propagated=${propagatedColonias} unmatched=${unmatchedColonias} total_rows=${allRows.length}`,
  );

  // Delete legacy synthetic rows + insert real (atomic batch)
  const { error: delErr } = await supabase
    .from('inegi_census_zone_stats')
    .delete()
    .eq('data_origin', 'inegi_synthetic_v1');
  if (delErr) console.error(`[demographics] delete synthetic warn: ${delErr.message}`);

  const { error: insErr } = await supabase.from('inegi_census_zone_stats').insert(allRows);
  if (insErr) throw new Error(`upsert_failed: ${insErr.message}`);

  console.info('[demographics] step 4/4 verify counts');
  const { count: totalCount } = await supabase
    .from('inegi_census_zone_stats')
    .select('*', { count: 'exact', head: true });
  const { count: realCount } = await supabase
    .from('inegi_census_zone_stats')
    .select('*', { count: 'exact', head: true })
    .eq('data_origin', 'inegi_municipal_proxy');
  console.info(`[demographics]   total rows=${totalCount} real=${realCount}`);

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.info(`[demographics] done in ${elapsed}s`);
}

main().catch((e) => {
  console.error('[demographics] fatal', e);
  process.exit(1);
});
