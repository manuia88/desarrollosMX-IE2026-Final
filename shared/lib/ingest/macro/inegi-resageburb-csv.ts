// F1.C.C Tier 2 Demographics — INEGI RESAGEBURB CSV parser
//
// Descarga RESAGEBURB ZIP CDMX (~12 MB) y parse CSV ~44 MB / 230 columnas.
// Filtra rows AGEB-total (MZA='000', AGEB!='0000') = 2,433 rows for CDMX.
//
// Coerce cells suprimidas '*' / '' / 'N/D' → null vía parseInegiValue
// reusable. AGEB hex codes (e.g., '003A') preserve via dynamicTyping: false.
//
// Refs: SA-ITER-Spatial-Overlay-Research.md §1
//       https://www.inegi.org.mx/contenidos/programas/ccpv/2020/microdatos/ageb_manzana/RESAGEBURB_09_2020_csv.zip

import AdmZip from 'adm-zip';
import Papa from 'papaparse';
import { parseInegiValue } from './inegi.ts';

export const RESAGEBURB_CDMX_ZIP_URL =
  'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/microdatos/ageb_manzana/RESAGEBURB_09_2020_csv.zip';

export type AgebDataRow = {
  cve_ent: string;
  cve_mun: string;
  cve_loc: string;
  cve_ageb: string;
  pobtot: number | null;
  pob_0_14: number | null;
  pob_15_64: number | null;
  pob_65_mas: number | null;
  poblacion_12y: number | null;
  tothog: number | null;
  graproes: number | null;
  pea: number | null;
  vph_inter: number | null;
  vph_pc: number | null;
};

type RawCsvRow = {
  ENTIDAD?: string;
  MUN?: string;
  LOC?: string;
  AGEB?: string;
  MZA?: string;
  POBTOT?: string;
  P_0A2?: string;
  P_3YMAS?: string;
  P_5YMAS?: string;
  P_12YMAS?: string;
  P_15YMAS?: string;
  P_18YMAS?: string;
  P_3A5?: string;
  P_6A11?: string;
  P_8A14?: string;
  P_12A14?: string;
  P_15A17?: string;
  P_18A24?: string;
  P_60YMAS?: string;
  P_65YMAS?: string;
  GRAPROES?: string;
  PEA?: string;
  TOTHOG?: string;
  TVIVHAB?: string;
  VPH_INTER?: string;
  VPH_PC?: string;
  // Computed sums for age buckets
  P_0A14?: string;
  P_15A64?: string;
};

/**
 * Descarga RESAGEBURB ZIP entidad 09 (CDMX) y devuelve buffer.
 */
export async function downloadResageburbZip(
  zipUrl: string = RESAGEBURB_CDMX_ZIP_URL,
): Promise<Buffer> {
  const res = await fetch(zipUrl);
  if (!res.ok) {
    throw new Error(`[resageburb] download failed HTTP ${res.status} url=${zipUrl}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extrae el único CSV del ZIP (RESAGEBURB_09CSV20.csv).
 */
export function extractCsvFromZip(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const csvEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.csv'));
  if (!csvEntry) {
    throw new Error(
      `[resageburb] no .csv found in ZIP. entries: [${entries.map((e) => e.entryName).join(', ')}]`,
    );
  }
  return csvEntry.getData().toString('utf-8');
}

/**
 * Parse RESAGEBURB CSV. Filtra solo rows AGEB-totales (MZA='000', AGEB!='0000').
 * Coerce '*' / '' → null via parseInegiValue. Preserves hex AGEB codes.
 */
export function parseResageburbCsv(csvText: string): AgebDataRow[] {
  const parsed = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // CRITICAL: preserve hex AGEB codes ('003A')
    transformHeader: (h) => h.trim().toUpperCase(),
  });

  if (parsed.errors.length > 0) {
    const firstErr = parsed.errors[0];
    if (firstErr) {
      console.error(
        `[resageburb] papaparse errors first: ${firstErr.message} (row ${firstErr.row})`,
      );
    }
  }

  const rows: AgebDataRow[] = [];
  const seen = new Set<string>();

  for (const r of parsed.data) {
    // Filtro AGEB-total: MZA='000' AND AGEB != '0000'
    const mza = String(r.MZA ?? '').padStart(3, '0');
    const ageb = String(r.AGEB ?? '').padStart(4, '0');
    if (mza !== '000' || ageb === '0000') continue;

    const cve_ent = String(r.ENTIDAD ?? '').padStart(2, '0');
    const cve_mun = String(r.MUN ?? '').padStart(3, '0');
    const cve_loc = String(r.LOC ?? '').padStart(4, '0');
    const cve_ageb = ageb;

    // Dedupe defensive (some AGEBs span multiple LOC rows in RESAGEBURB)
    const key = `${cve_ent}${cve_mun}${cve_loc}${cve_ageb}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Compute age buckets from finer-grain columns when available.
    // Censo 2020 RESAGEBURB doesn't expose POB_0_14 directly — derive.
    const p_0a14 =
      sumOptional([r.P_0A2, r.P_3A5, r.P_6A11, r.P_12A14]) ?? parseInegiValue(r.P_0A14);
    const p_15a64 = sumOptional([
      r.P_15A17,
      r.P_18A24,
      // 25-59 not directly in RESAGEBURB; approximate as POBTOT - children - seniors
    ]);
    const p_65mas = parseInegiValue(r.P_65YMAS);

    const pobtot = parseInegiValue(r.POBTOT);
    const computed_15a64 =
      pobtot != null && p_0a14 != null && p_65mas != null
        ? pobtot - p_0a14 - p_65mas
        : (p_15a64 ?? null);

    rows.push({
      cve_ent,
      cve_mun,
      cve_loc,
      cve_ageb,
      pobtot,
      pob_0_14: p_0a14,
      pob_15_64: computed_15a64,
      pob_65_mas: p_65mas,
      poblacion_12y: parseInegiValue(r.P_12YMAS),
      tothog: parseInegiValue(r.TOTHOG),
      graproes: parseInegiValue(r.GRAPROES),
      pea: parseInegiValue(r.PEA),
      vph_inter: parseInegiValue(r.VPH_INTER),
      vph_pc: parseInegiValue(r.VPH_PC),
    });
  }

  return rows;
}

function sumOptional(values: (string | undefined)[]): number | null {
  let total = 0;
  let anyValid = false;
  for (const v of values) {
    const n = parseInegiValue(v);
    if (n != null) {
      total += n;
      anyValid = true;
    }
  }
  return anyValid ? total : null;
}

/**
 * Builds composite 13-char join key matching MGN AGEB feature key.
 */
export function agebRowKey(row: AgebDataRow): string {
  return `${row.cve_ent}${row.cve_mun}${row.cve_loc}${row.cve_ageb}`;
}
