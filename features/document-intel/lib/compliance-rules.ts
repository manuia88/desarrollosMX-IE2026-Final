// FASE 17.D Compliance Cross-Check rules — 7 reglas canon
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Reglas iniciales LATAM (GC-1 lateral único):
//   1. CC_UNIDADES_COUNT — permiso SEDUVI vs LP unidades count
//   2. CC_M2_TOTAL — permiso vs LP m2_total_construccion (warning si diff >2%)
//   3. CC_PREDIO_AREA — predial vs escritura area_predio_m2 (critical si diff >5%)
//   4. CC_VIGENCIA_PERMISO — permiso vigencia vs licencia construccion fecha (warning gap >365d)
//   5. CC_RFC_CONSISTENCY — escritura vs predial vs LP (warning si mismatch)
//   6. CC_NOTARIO_VALID — escritura notario_num numérico + name no vacío (info missing)
//   7. CC_DIRECCION_MATCH — predial vs escritura fuzzy match (warning <0.7)

import type { DocType } from '@/features/document-intel/schemas/validation';

export type ComplianceSeverity = 'info' | 'warning' | 'critical';

export interface ComplianceFinding {
  readonly check_code: string;
  readonly severity: ComplianceSeverity;
  readonly finding: string;
  readonly conflicting_data: Record<string, unknown>;
  readonly source_doc_types: ReadonlyArray<DocType>;
}

export interface ComplianceRule {
  readonly code: string;
  readonly severity: ComplianceSeverity;
  readonly description: string;
  readonly requires: ReadonlyArray<DocType>;
  readonly check: (docs: ReadonlyMap<DocType, Record<string, unknown>>) => ComplianceFinding | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

function asNumber(v: unknown): number | null {
  if (isFiniteNumber(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.-]/g, '');
    if (cleaned.length === 0) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pctDiff(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  const denom = Math.max(Math.abs(a), Math.abs(b));
  if (denom === 0) return 0;
  return Math.abs(a - b) / denom;
}

// Trigram-style Jaccard similarity (sin libs externas).
export function fuzzyMatch(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (x.length === 0 || y.length === 0) return 0;
  if (x === y) return 1;
  const trigrams = (s: string): Set<string> => {
    const out = new Set<string>();
    const padded = `  ${s}  `;
    for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
    return out;
  };
  const sx = trigrams(x);
  const sy = trigrams(y);
  if (sx.size === 0 || sy.size === 0) return 0;
  let inter = 0;
  for (const t of sx) if (sy.has(t)) inter += 1;
  const union = sx.size + sy.size - inter;
  return union === 0 ? 0 : inter / union;
}

function getUnidadesCount(data: Record<string, unknown>): number | null {
  const u = data.unidades;
  if (isArray(u)) return u.length;
  const total = data.total_unidades ?? data.numero_unidades ?? data.unidades_count;
  return asNumber(total);
}

function getM2Total(data: Record<string, unknown>): number | null {
  return asNumber(
    data.m2_total_construccion ?? data.m2_construccion_total ?? data.area_construccion_total,
  );
}

function getPredioArea(data: Record<string, unknown>): number | null {
  return asNumber(
    data.area_predio_m2 ??
      data.superficie_predio_m2 ??
      data.area_terreno_m2 ??
      data.superficie_terreno_m2,
  );
}

function getRfc(data: Record<string, unknown>): string | null {
  const candidates = [data.rfc, data.rfc_propietario, data.rfc_desarrolladora, data.rfc_emisor];
  for (const c of candidates) {
    if (isNonEmptyString(c)) return c.toUpperCase().replace(/\s+/g, '');
  }
  const partes = data.partes;
  if (isArray(partes)) {
    for (const p of partes) {
      if (isRecord(p) && isNonEmptyString(p.rfc)) {
        return p.rfc.toUpperCase().replace(/\s+/g, '');
      }
    }
  }
  return null;
}

function getDireccion(data: Record<string, unknown>): string | null {
  const candidates = [data.direccion, data.ubicacion, data.direccion_predio, data.domicilio];
  for (const c of candidates) {
    if (isNonEmptyString(c)) return c;
  }
  return null;
}

export const COMPLIANCE_RULES: ReadonlyArray<ComplianceRule> = [
  {
    code: 'CC_UNIDADES_COUNT',
    severity: 'critical',
    description: 'Permiso SEDUVI vs Lista Precios — count de unidades',
    requires: ['permiso_seduvi', 'lista_precios'],
    check: (docs) => {
      const permiso = docs.get('permiso_seduvi');
      const lp = docs.get('lista_precios');
      if (!permiso || !lp) return null;
      const cPermiso = getUnidadesCount(permiso);
      const cLp = getUnidadesCount(lp);
      if (cPermiso === null || cLp === null) return null;
      if (cPermiso === cLp) return null;
      return {
        check_code: 'CC_UNIDADES_COUNT',
        severity: 'critical',
        finding: `Discrepancia en número de unidades: permiso SEDUVI declara ${cPermiso}, lista de precios declara ${cLp}.`,
        conflicting_data: {
          permiso_seduvi_unidades: cPermiso,
          lista_precios_unidades: cLp,
          diff: cLp - cPermiso,
        },
        source_doc_types: ['permiso_seduvi', 'lista_precios'],
      };
    },
  },
  {
    code: 'CC_M2_TOTAL',
    severity: 'warning',
    description: 'Permiso vs Lista Precios — m2 total construcción (>2%)',
    requires: ['permiso_seduvi', 'lista_precios'],
    check: (docs) => {
      const permiso = docs.get('permiso_seduvi');
      const lp = docs.get('lista_precios');
      if (!permiso || !lp) return null;
      const mPermiso = getM2Total(permiso);
      const mLp = getM2Total(lp);
      if (mPermiso === null || mLp === null) return null;
      const diffPct = pctDiff(mPermiso, mLp);
      if (diffPct <= 0.02) return null;
      return {
        check_code: 'CC_M2_TOTAL',
        severity: 'warning',
        finding: `Discrepancia en m² totales de construcción: permiso reporta ${mPermiso} m², lista de precios ${mLp} m² (diferencia ${(diffPct * 100).toFixed(2)}%).`,
        conflicting_data: {
          permiso_m2: mPermiso,
          lista_precios_m2: mLp,
          diff_pct: Number(diffPct.toFixed(4)),
        },
        source_doc_types: ['permiso_seduvi', 'lista_precios'],
      };
    },
  },
  {
    code: 'CC_PREDIO_AREA',
    severity: 'critical',
    description: 'Predial vs Escritura — área de predio (>5%)',
    requires: ['predial', 'escritura'],
    check: (docs) => {
      const predial = docs.get('predial');
      const escritura = docs.get('escritura');
      if (!predial || !escritura) return null;
      const aPredial = getPredioArea(predial);
      const aEscritura = getPredioArea(escritura);
      if (aPredial === null || aEscritura === null) return null;
      const diffPct = pctDiff(aPredial, aEscritura);
      if (diffPct <= 0.05) return null;
      return {
        check_code: 'CC_PREDIO_AREA',
        severity: 'critical',
        finding: `Discrepancia crítica en área de predio: predial declara ${aPredial} m², escritura declara ${aEscritura} m² (diferencia ${(diffPct * 100).toFixed(2)}%).`,
        conflicting_data: {
          predial_area_m2: aPredial,
          escritura_area_m2: aEscritura,
          diff_pct: Number(diffPct.toFixed(4)),
        },
        source_doc_types: ['predial', 'escritura'],
      };
    },
  },
  {
    code: 'CC_VIGENCIA_PERMISO',
    severity: 'warning',
    description: 'Permiso vigencia vs Licencia construcción — gap >365d',
    requires: ['permiso_seduvi', 'licencia_construccion'],
    check: (docs) => {
      const permiso = docs.get('permiso_seduvi');
      const licencia = docs.get('licencia_construccion');
      if (!permiso || !licencia) return null;
      const dPermisoFin =
        parseDate(permiso.vigencia_fin) ??
        parseDate(permiso.fecha_vencimiento) ??
        parseDate(permiso.vigencia);
      const dLicenciaInicio =
        parseDate(licencia.fecha_emision) ??
        parseDate(licencia.fecha_inicio) ??
        parseDate(licencia.fecha_expedicion);
      if (!dPermisoFin || !dLicenciaInicio) return null;
      const gapDays = Math.abs(dPermisoFin.getTime() - dLicenciaInicio.getTime()) / 86_400_000;
      if (gapDays <= 365) return null;
      return {
        check_code: 'CC_VIGENCIA_PERMISO',
        severity: 'warning',
        finding: `Gap temporal grande entre permiso SEDUVI y licencia de construcción: ${Math.round(gapDays)} días.`,
        conflicting_data: {
          permiso_vigencia_fin: dPermisoFin.toISOString(),
          licencia_fecha: dLicenciaInicio.toISOString(),
          gap_days: Math.round(gapDays),
        },
        source_doc_types: ['permiso_seduvi', 'licencia_construccion'],
      };
    },
  },
  {
    code: 'CC_RFC_CONSISTENCY',
    severity: 'warning',
    description: 'RFC consistente entre escritura, predial, lista_precios',
    requires: ['escritura', 'predial'],
    check: (docs) => {
      const escritura = docs.get('escritura');
      const predial = docs.get('predial');
      if (!escritura || !predial) return null;
      const rfcEsc = getRfc(escritura);
      const rfcPred = getRfc(predial);
      const rfcLp = (() => {
        const lp = docs.get('lista_precios');
        return lp ? getRfc(lp) : null;
      })();
      if (!rfcEsc || !rfcPred) return null;
      const set = new Set<string>([rfcEsc, rfcPred]);
      if (rfcLp) set.add(rfcLp);
      if (set.size === 1) return null;
      return {
        check_code: 'CC_RFC_CONSISTENCY',
        severity: 'warning',
        finding: `RFCs inconsistentes entre documentos: ${[...set].join(' vs ')}.`,
        conflicting_data: {
          escritura_rfc: rfcEsc,
          predial_rfc: rfcPred,
          lista_precios_rfc: rfcLp,
        },
        source_doc_types: rfcLp
          ? ['escritura', 'predial', 'lista_precios']
          : ['escritura', 'predial'],
      };
    },
  },
  {
    code: 'CC_NOTARIO_VALID',
    severity: 'info',
    description: 'Escritura — notario_num numérico + notario_name no vacío',
    requires: ['escritura'],
    check: (docs) => {
      const escritura = docs.get('escritura');
      if (!escritura) return null;
      const notarioNum = escritura.notario_num ?? escritura.notario_numero;
      const notarioName = escritura.notario_name ?? escritura.notario_nombre;
      const numOk = asNumber(notarioNum) !== null;
      const nameOk = isNonEmptyString(notarioName);
      if (numOk && nameOk) return null;
      return {
        check_code: 'CC_NOTARIO_VALID',
        severity: 'info',
        finding: `Datos de notario incompletos en escritura: ${!numOk ? 'falta número de notaría' : ''}${!numOk && !nameOk ? ' y ' : ''}${!nameOk ? 'falta nombre de notario' : ''}.`,
        conflicting_data: {
          notario_num: notarioNum ?? null,
          notario_name: notarioName ?? null,
          num_valid: numOk,
          name_valid: nameOk,
        },
        source_doc_types: ['escritura'],
      };
    },
  },
  {
    code: 'CC_DIRECCION_MATCH',
    severity: 'warning',
    description: 'Predial vs Escritura — direccion fuzzy match (<0.7)',
    requires: ['predial', 'escritura'],
    check: (docs) => {
      const predial = docs.get('predial');
      const escritura = docs.get('escritura');
      if (!predial || !escritura) return null;
      const dirP = getDireccion(predial);
      const dirE = getDireccion(escritura);
      if (!dirP || !dirE) return null;
      const sim = fuzzyMatch(dirP, dirE);
      if (sim >= 0.7) return null;
      return {
        check_code: 'CC_DIRECCION_MATCH',
        severity: 'warning',
        finding: `Dirección no coincide entre predial y escritura (similitud ${(sim * 100).toFixed(0)}%).`,
        conflicting_data: {
          predial_direccion: dirP,
          escritura_direccion: dirE,
          similarity: Number(sim.toFixed(4)),
        },
        source_doc_types: ['predial', 'escritura'],
      };
    },
  },
];

export function evaluateRule(
  rule: ComplianceRule,
  docs: ReadonlyMap<DocType, Record<string, unknown>>,
): ComplianceFinding | null {
  const allRequired = rule.requires.every((dt) => docs.has(dt));
  if (!allRequired) return null;
  return rule.check(docs);
}
