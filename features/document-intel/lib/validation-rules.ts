import type {
  DocType,
  ValidationFinding,
  ValidationRuleResult,
  ValidationSeverity,
} from '../schemas/validation';

export interface ValidationRule {
  readonly code: string;
  readonly appliesTo: ReadonlyArray<DocType>;
  readonly severity: ValidationSeverity;
  readonly description: string;
  readonly validate: (data: Record<string, unknown>) => ValidationRuleResult;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const RFC_MX_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i;

function getUnidades(data: Record<string, unknown>): Record<string, unknown>[] | null {
  const u = data['unidades'];
  if (!isArray(u)) return null;
  return u.filter(isRecord);
}

function getPartes(data: Record<string, unknown>): Record<string, unknown>[] | null {
  const p = data['partes'];
  if (!isArray(p)) return null;
  return p.filter(isRecord);
}

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const VALIDATION_RULES: ReadonlyArray<ValidationRule> = [
  // ─── LISTA_PRECIOS ───
  {
    code: 'LP_TIENE_UNIDADES',
    appliesTo: ['lista_precios'],
    severity: 'critical',
    description: 'Lista precios debe declarar al menos una unidad',
    validate: (data) => {
      const unidades = getUnidades(data);
      const ok = !!unidades && unidades.length > 0;
      return ok
        ? { pass: true }
        : {
            pass: false,
            field: 'unidades',
            expected: '>=1',
            actual: String(unidades?.length ?? 0),
          };
    },
  },
  {
    code: 'LP_PRECIOS_NUMERIC',
    appliesTo: ['lista_precios'],
    severity: 'critical',
    description: 'Todos los precios deben ser numéricos',
    validate: (data) => {
      const unidades = getUnidades(data) ?? [];
      const bad = unidades.findIndex((u) => !isFiniteNumber(u['precio_mxn']));
      return bad === -1
        ? { pass: true }
        : {
            pass: false,
            field: `unidades[${bad}].precio_mxn`,
            expected: 'number',
            actual: typeof unidades[bad]?.['precio_mxn'],
          };
    },
  },
  {
    code: 'LP_PRECIOS_RANGO',
    appliesTo: ['lista_precios'],
    severity: 'warning',
    description: 'Precios deben estar entre $500K y $500M MXN',
    validate: (data) => {
      const unidades = getUnidades(data) ?? [];
      const bad = unidades.findIndex((u) => {
        const p = u['precio_mxn'];
        return isFiniteNumber(p) && (p < 500_000 || p > 500_000_000);
      });
      return bad === -1
        ? { pass: true }
        : {
            pass: false,
            field: `unidades[${bad}].precio_mxn`,
            expected: '500000-500000000',
            actual: String(unidades[bad]?.['precio_mxn']),
          };
    },
  },
  {
    code: 'LP_M2_NUMERIC',
    appliesTo: ['lista_precios'],
    severity: 'error',
    description: 'Todos los m² deben ser numéricos > 0',
    validate: (data) => {
      const unidades = getUnidades(data) ?? [];
      const bad = unidades.findIndex(
        (u) => !isFiniteNumber(u['m2']) || (u['m2'] as number) <= 0,
      );
      return bad === -1
        ? { pass: true }
        : {
            pass: false,
            field: `unidades[${bad}].m2`,
            expected: 'number > 0',
            actual: String(unidades[bad]?.['m2']),
          };
    },
  },
  {
    code: 'LP_TIPOLOGIA_PRESENTE',
    appliesTo: ['lista_precios'],
    severity: 'warning',
    description: 'Cada unidad debe declarar tipología',
    validate: (data) => {
      const unidades = getUnidades(data) ?? [];
      const bad = unidades.findIndex((u) => !isNonEmptyString(u['tipologia']));
      return bad === -1
        ? { pass: true }
        : { pass: false, field: `unidades[${bad}].tipologia`, expected: 'non-empty string' };
    },
  },

  // ─── ESCRITURA ───
  {
    code: 'ESC_NUM_PRESENT',
    appliesTo: ['escritura'],
    severity: 'critical',
    description: 'Número de escritura presente',
    validate: (data) =>
      isNonEmptyString(data['num_escritura'])
        ? { pass: true }
        : { pass: false, field: 'num_escritura', expected: 'non-empty string' },
  },
  {
    code: 'ESC_FECHA_VALID',
    appliesTo: ['escritura'],
    severity: 'critical',
    description: 'Fecha de escritura válida y anterior a hoy',
    validate: (data) => {
      const d = parseDate(data['fecha']);
      if (!d) return { pass: false, field: 'fecha', expected: 'ISO date' };
      if (d.getTime() > Date.now())
        return { pass: false, field: 'fecha', expected: 'past date', actual: d.toISOString() };
      return { pass: true };
    },
  },
  {
    code: 'ESC_NOTARIO_NUM',
    appliesTo: ['escritura'],
    severity: 'error',
    description: 'Número de notario debe ser numérico',
    validate: (data) => {
      const n = data['notario_num'];
      const ok = isFiniteNumber(n) || (typeof n === 'string' && /^\d+$/.test(n));
      return ok
        ? { pass: true }
        : { pass: false, field: 'notario_num', expected: 'numeric', actual: String(n) };
    },
  },
  {
    code: 'ESC_PARTES_MINIMUM',
    appliesTo: ['escritura'],
    severity: 'critical',
    description: 'Escritura debe tener al menos 2 partes',
    validate: (data) => {
      const partes = getPartes(data);
      const ok = !!partes && partes.length >= 2;
      return ok
        ? { pass: true }
        : { pass: false, field: 'partes', expected: '>=2', actual: String(partes?.length ?? 0) };
    },
  },
  {
    code: 'ESC_RFC_PRESENT',
    appliesTo: ['escritura'],
    severity: 'warning',
    description: 'Al menos un RFC válido en partes',
    validate: (data) => {
      const partes = getPartes(data) ?? [];
      const hasValid = partes.some((p) => {
        const r = p['rfc'];
        return typeof r === 'string' && RFC_MX_REGEX.test(r);
      });
      return hasValid
        ? { pass: true }
        : { pass: false, field: 'partes[].rfc', expected: 'at least 1 valid MX RFC' };
    },
  },

  // ─── PERMISO_SEDUVI ───
  {
    code: 'PERM_FOLIO',
    appliesTo: ['permiso_seduvi'],
    severity: 'critical',
    description: 'Folio del permiso presente',
    validate: (data) =>
      isNonEmptyString(data['folio'])
        ? { pass: true }
        : { pass: false, field: 'folio', expected: 'non-empty string' },
  },
  {
    code: 'PERM_VIGENCIA_FUTURE',
    appliesTo: ['permiso_seduvi'],
    severity: 'critical',
    description: 'Vigencia del permiso debe ser futura',
    validate: (data) => {
      const d = parseDate(data['vigencia_fecha']);
      if (!d) return { pass: false, field: 'vigencia_fecha', expected: 'ISO date' };
      return d.getTime() > Date.now()
        ? { pass: true }
        : {
            pass: false,
            field: 'vigencia_fecha',
            expected: 'future date',
            actual: d.toISOString(),
          };
    },
  },
  {
    code: 'PERM_NIVELES',
    appliesTo: ['permiso_seduvi'],
    severity: 'error',
    description: 'Niveles autorizados entre 1 y 50',
    validate: (data) => {
      const n = data['niveles_autorizados'];
      const ok = isFiniteNumber(n) && Number.isInteger(n) && n >= 1 && n <= 50;
      return ok
        ? { pass: true }
        : {
            pass: false,
            field: 'niveles_autorizados',
            expected: 'integer 1-50',
            actual: String(n),
          };
    },
  },
  {
    code: 'PERM_M2_NUMERIC',
    appliesTo: ['permiso_seduvi'],
    severity: 'error',
    description: 'm² construcción numérico > 0',
    validate: (data) => {
      const v = data['m2_construccion'];
      const ok = isFiniteNumber(v) && v > 0;
      return ok
        ? { pass: true }
        : {
            pass: false,
            field: 'm2_construccion',
            expected: 'number > 0',
            actual: String(v),
          };
    },
  },

  // ─── ESTUDIO_SUELO ───
  {
    code: 'ESTUDIO_LAB',
    appliesTo: ['estudio_suelo'],
    severity: 'warning',
    description: 'Laboratorio responsable presente',
    validate: (data) =>
      isNonEmptyString(data['laboratorio'])
        ? { pass: true }
        : { pass: false, field: 'laboratorio', expected: 'non-empty string' },
  },
  {
    code: 'ESTUDIO_CARGA',
    appliesTo: ['estudio_suelo'],
    severity: 'critical',
    description: 'Capacidad de carga numérica > 0',
    validate: (data) => {
      const v = data['capacidad_carga_kg_m2'];
      const ok = isFiniteNumber(v) && v > 0;
      return ok
        ? { pass: true }
        : {
            pass: false,
            field: 'capacidad_carga_kg_m2',
            expected: 'number > 0',
            actual: String(v),
          };
    },
  },

  // ─── LICENCIA_CONSTRUCCION ───
  {
    code: 'LIC_FOLIO',
    appliesTo: ['licencia_construccion'],
    severity: 'critical',
    description: 'Folio de licencia presente',
    validate: (data) =>
      isNonEmptyString(data['folio'])
        ? { pass: true }
        : { pass: false, field: 'folio', expected: 'non-empty string' },
  },
  {
    code: 'LIC_VIGENCIA',
    appliesTo: ['licencia_construccion'],
    severity: 'critical',
    description: 'Vigencia de licencia futura',
    validate: (data) => {
      const d = parseDate(data['vigencia_fecha']);
      if (!d) return { pass: false, field: 'vigencia_fecha', expected: 'ISO date' };
      return d.getTime() > Date.now()
        ? { pass: true }
        : {
            pass: false,
            field: 'vigencia_fecha',
            expected: 'future date',
            actual: d.toISOString(),
          };
    },
  },
  {
    code: 'LIC_DEV_RFC',
    appliesTo: ['licencia_construccion'],
    severity: 'warning',
    description: 'RFC del desarrollador válido',
    validate: (data) => {
      const r = data['desarrollador_rfc'];
      return typeof r === 'string' && RFC_MX_REGEX.test(r)
        ? { pass: true }
        : { pass: false, field: 'desarrollador_rfc', expected: 'valid MX RFC' };
    },
  },

  // ─── PREDIAL ───
  {
    code: 'PREDIAL_CUENTA_NUM',
    appliesTo: ['predial'],
    severity: 'critical',
    description: 'Número de cuenta predial presente',
    validate: (data) =>
      isNonEmptyString(data['cuenta_predial'])
        ? { pass: true }
        : { pass: false, field: 'cuenta_predial', expected: 'non-empty string' },
  },
  {
    code: 'PREDIAL_AL_CORRIENTE',
    appliesTo: ['predial'],
    severity: 'critical',
    description: 'Predial al corriente (sin adeudo)',
    validate: (data) => {
      const adeudo = data['adeudo_mxn'];
      const ok = !isFiniteNumber(adeudo) || adeudo === 0;
      return ok
        ? { pass: true }
        : { pass: false, field: 'adeudo_mxn', expected: '0', actual: String(adeudo) };
    },
  },
  {
    code: 'PREDIAL_VIGENCIA',
    appliesTo: ['predial'],
    severity: 'warning',
    description: 'Vigencia del predial dentro del año fiscal corriente',
    validate: (data) => {
      const ejercicio = data['ejercicio_fiscal'];
      const currentYear = new Date().getFullYear();
      const ok =
        isFiniteNumber(ejercicio) && ejercicio >= currentYear - 1 && ejercicio <= currentYear;
      return ok
        ? { pass: true }
        : {
            pass: false,
            field: 'ejercicio_fiscal',
            expected: `${currentYear - 1}-${currentYear}`,
            actual: String(ejercicio),
          };
    },
  },

  // ─── BROCHURE ───
  {
    code: 'BROCH_PROYECTO_NOMBRE',
    appliesTo: ['brochure'],
    severity: 'warning',
    description: 'Nombre del proyecto en brochure',
    validate: (data) =>
      isNonEmptyString(data['proyecto_nombre'])
        ? { pass: true }
        : { pass: false, field: 'proyecto_nombre', expected: 'non-empty string' },
  },
  {
    code: 'BROCH_UBICACION',
    appliesTo: ['brochure'],
    severity: 'warning',
    description: 'Ubicación declarada en brochure',
    validate: (data) =>
      isNonEmptyString(data['ubicacion'])
        ? { pass: true }
        : { pass: false, field: 'ubicacion', expected: 'non-empty string' },
  },
  {
    code: 'BROCH_AMENIDADES',
    appliesTo: ['brochure'],
    severity: 'info',
    description: 'Amenidades declaradas (recomendado)',
    validate: (data) => {
      const a = data['amenidades'];
      return isArray(a) && a.length > 0
        ? { pass: true }
        : { pass: false, field: 'amenidades', expected: 'array length > 0' };
    },
  },

  // ─── PLANO_ARQUITECTONICO ───
  {
    code: 'PLANO_NIVELES',
    appliesTo: ['planos_arquitectonicos'],
    severity: 'warning',
    description: 'Plano declara número de niveles',
    validate: (data) => {
      const n = data['niveles'];
      return isFiniteNumber(n) && Number.isInteger(n) && n >= 1
        ? { pass: true }
        : { pass: false, field: 'niveles', expected: 'integer >= 1', actual: String(n) };
    },
  },
  {
    code: 'PLANO_M2_TOTAL',
    appliesTo: ['planos_arquitectonicos'],
    severity: 'warning',
    description: 'Plano declara m² totales',
    validate: (data) => {
      const v = data['m2_total'];
      return isFiniteNumber(v) && v > 0
        ? { pass: true }
        : { pass: false, field: 'm2_total', expected: 'number > 0', actual: String(v) };
    },
  },

  // ─── CONTRATO_COMPRA_VENTA ───
  {
    code: 'CCV_PARTES',
    appliesTo: ['contrato_compra_venta'],
    severity: 'critical',
    description: 'Contrato compra-venta requiere comprador y vendedor',
    validate: (data) => {
      const partes = getPartes(data);
      return partes && partes.length >= 2
        ? { pass: true }
        : {
            pass: false,
            field: 'partes',
            expected: '>=2',
            actual: String(partes?.length ?? 0),
          };
    },
  },
  {
    code: 'CCV_PRECIO',
    appliesTo: ['contrato_compra_venta'],
    severity: 'critical',
    description: 'Contrato declara precio total numérico',
    validate: (data) => {
      const v = data['precio_total_mxn'];
      return isFiniteNumber(v) && v > 0
        ? { pass: true }
        : {
            pass: false,
            field: 'precio_total_mxn',
            expected: 'number > 0',
            actual: String(v),
          };
    },
  },
  {
    code: 'CCV_VIGENCIA',
    appliesTo: ['contrato_compra_venta'],
    severity: 'error',
    description: 'Fecha de firma o vigencia válida',
    validate: (data) => {
      const d = parseDate(data['fecha_firma'] ?? data['vigencia_fecha']);
      return d
        ? { pass: true }
        : { pass: false, field: 'fecha_firma|vigencia_fecha', expected: 'ISO date' };
    },
  },

  // ─── CONSTANCIA_SITUACION_FISCAL ───
  {
    code: 'CSF_RFC_VALID',
    appliesTo: ['constancia_situacion_fiscal'],
    severity: 'critical',
    description: 'RFC válido en constancia de situación fiscal',
    validate: (data) => {
      const r = data['rfc'];
      return typeof r === 'string' && RFC_MX_REGEX.test(r)
        ? { pass: true }
        : { pass: false, field: 'rfc', expected: 'valid MX RFC', actual: String(r) };
    },
  },
  {
    code: 'CSF_REGIMEN',
    appliesTo: ['constancia_situacion_fiscal'],
    severity: 'warning',
    description: 'Régimen fiscal declarado',
    validate: (data) =>
      isNonEmptyString(data['regimen_fiscal'])
        ? { pass: true }
        : { pass: false, field: 'regimen_fiscal', expected: 'non-empty string' },
  },
  {
    code: 'CSF_VIGENCIA',
    appliesTo: ['constancia_situacion_fiscal'],
    severity: 'warning',
    description: 'Fecha de emisión dentro de los últimos 90 días',
    validate: (data) => {
      const d = parseDate(data['fecha_emision']);
      if (!d) return { pass: false, field: 'fecha_emision', expected: 'ISO date' };
      const ageDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return ageDays <= 90
        ? { pass: true }
        : {
            pass: false,
            field: 'fecha_emision',
            expected: '<= 90 days old',
            actual: `${Math.round(ageDays)}d`,
          };
    },
  },
];

export interface ValidateOptions {
  readonly docType: DocType;
  readonly extracted: Record<string, unknown>;
}

export function getRulesForDocType(docType: DocType): ReadonlyArray<ValidationRule> {
  return VALIDATION_RULES.filter((r) => r.appliesTo.includes(docType));
}

export function runValidation({ docType, extracted }: ValidateOptions): ValidationFinding[] {
  const rules = getRulesForDocType(docType);
  const findings: ValidationFinding[] = [];
  for (const rule of rules) {
    const result = rule.validate(extracted);
    if (result.pass) continue;
    findings.push({
      rule_code: rule.code,
      severity: rule.severity,
      message: result.message ?? rule.description,
      field_path: result.field ?? null,
      expected_value: result.expected ?? null,
      actual_value: result.actual ?? null,
    });
  }
  return findings;
}

export function listSupportedDocTypes(): ReadonlyArray<DocType> {
  const set = new Set<DocType>();
  for (const r of VALIDATION_RULES) for (const t of r.appliesTo) set.add(t);
  return Array.from(set);
}
