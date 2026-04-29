import { describe, expect, it } from 'vitest';
import {
  getRulesForDocType,
  listSupportedDocTypes,
  runValidation,
  VALIDATION_RULES,
} from '../lib/validation-rules';
import type { DocType } from '../schemas/validation';

describe('validation-rules registry', () => {
  it('exports at least 30 rules', () => {
    expect(VALIDATION_RULES.length).toBeGreaterThanOrEqual(30);
  });

  it('every rule has unique code', () => {
    const codes = VALIDATION_RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every rule has at least 1 doc type and valid severity', () => {
    for (const rule of VALIDATION_RULES) {
      expect(rule.appliesTo.length).toBeGreaterThan(0);
      expect(['info', 'warning', 'error', 'critical']).toContain(rule.severity);
      expect(rule.code).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it('lists 9+ supported doc types', () => {
    const types = listSupportedDocTypes();
    expect(types.length).toBeGreaterThanOrEqual(9);
    expect(types).toContain('lista_precios');
    expect(types).toContain('escritura');
    expect(types).toContain('permiso_seduvi');
    expect(types).toContain('estudio_suelo');
    expect(types).toContain('licencia_construccion');
    expect(types).toContain('predial');
    expect(types).toContain('brochure');
    expect(types).toContain('planos_arquitectonicos');
    expect(types).toContain('contrato_compra_venta');
    expect(types).toContain('constancia_situacion_fiscal');
  });

  it('returns no findings on a perfect lista_precios', () => {
    const findings = runValidation({
      docType: 'lista_precios',
      extracted: {
        unidades: [
          { precio_mxn: 5_000_000, m2: 80, tipologia: '2BR' },
          { precio_mxn: 8_500_000, m2: 110, tipologia: '3BR' },
        ],
      },
    });
    expect(findings).toEqual([]);
  });
});

type RuleCase = {
  code: string;
  docType: DocType;
  pass: Record<string, unknown>;
  fail: Record<string, unknown>;
};

const CASES: ReadonlyArray<RuleCase> = [
  // LISTA_PRECIOS
  {
    code: 'LP_TIENE_UNIDADES',
    docType: 'lista_precios',
    pass: { unidades: [{ precio_mxn: 5_000_000, m2: 80, tipologia: '2BR' }] },
    fail: { unidades: [] },
  },
  {
    code: 'LP_PRECIOS_NUMERIC',
    docType: 'lista_precios',
    pass: { unidades: [{ precio_mxn: 5_000_000, m2: 80, tipologia: '2BR' }] },
    fail: { unidades: [{ precio_mxn: 'cinco millones', m2: 80, tipologia: '2BR' }] },
  },
  {
    code: 'LP_PRECIOS_RANGO',
    docType: 'lista_precios',
    pass: { unidades: [{ precio_mxn: 5_000_000, m2: 80, tipologia: '2BR' }] },
    fail: { unidades: [{ precio_mxn: 50, m2: 80, tipologia: '2BR' }] },
  },
  {
    code: 'LP_M2_NUMERIC',
    docType: 'lista_precios',
    pass: { unidades: [{ precio_mxn: 5_000_000, m2: 80, tipologia: '2BR' }] },
    fail: { unidades: [{ precio_mxn: 5_000_000, m2: 0, tipologia: '2BR' }] },
  },
  {
    code: 'LP_TIPOLOGIA_PRESENTE',
    docType: 'lista_precios',
    pass: { unidades: [{ precio_mxn: 5_000_000, m2: 80, tipologia: '2BR' }] },
    fail: { unidades: [{ precio_mxn: 5_000_000, m2: 80, tipologia: '' }] },
  },
  // ESCRITURA
  {
    code: 'ESC_NUM_PRESENT',
    docType: 'escritura',
    pass: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
    fail: {
      num_escritura: '',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
  },
  {
    code: 'ESC_FECHA_VALID',
    docType: 'escritura',
    pass: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
    fail: {
      num_escritura: '12345',
      fecha: '2099-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
  },
  {
    code: 'ESC_NOTARIO_NUM',
    docType: 'escritura',
    pass: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
    fail: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 'cuarenta y dos',
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
  },
  {
    code: 'ESC_PARTES_MINIMUM',
    docType: 'escritura',
    pass: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
    fail: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [{ nombre: 'A', rfc: 'ABCD800101AB1' }],
    },
  },
  {
    code: 'ESC_RFC_PRESENT',
    docType: 'escritura',
    pass: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
    },
    fail: {
      num_escritura: '12345',
      fecha: '2024-01-15',
      notario_num: 42,
      partes: [
        { nombre: 'A', rfc: 'badrfc' },
        { nombre: 'B', rfc: '' },
      ],
    },
  },
  // PERMISO_SEDUVI
  {
    code: 'PERM_FOLIO',
    docType: 'permiso_seduvi',
    pass: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 8,
      m2_construccion: 4500,
    },
    fail: {
      folio: '',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 8,
      m2_construccion: 4500,
    },
  },
  {
    code: 'PERM_VIGENCIA_FUTURE',
    docType: 'permiso_seduvi',
    pass: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 8,
      m2_construccion: 4500,
    },
    fail: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2020-01-01',
      niveles_autorizados: 8,
      m2_construccion: 4500,
    },
  },
  {
    code: 'PERM_NIVELES',
    docType: 'permiso_seduvi',
    pass: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 8,
      m2_construccion: 4500,
    },
    fail: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 100,
      m2_construccion: 4500,
    },
  },
  {
    code: 'PERM_M2_NUMERIC',
    docType: 'permiso_seduvi',
    pass: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 8,
      m2_construccion: 4500,
    },
    fail: {
      folio: 'SEDUVI-2025-001',
      vigencia_fecha: '2099-12-31',
      niveles_autorizados: 8,
      m2_construccion: 0,
    },
  },
  // ESTUDIO_SUELO
  {
    code: 'ESTUDIO_LAB',
    docType: 'estudio_suelo',
    pass: { laboratorio: 'Geotec MX', capacidad_carga_kg_m2: 1500 },
    fail: { laboratorio: '', capacidad_carga_kg_m2: 1500 },
  },
  {
    code: 'ESTUDIO_CARGA',
    docType: 'estudio_suelo',
    pass: { laboratorio: 'Geotec MX', capacidad_carga_kg_m2: 1500 },
    fail: { laboratorio: 'Geotec MX', capacidad_carga_kg_m2: 0 },
  },
  // LICENCIA_CONSTRUCCION
  {
    code: 'LIC_FOLIO',
    docType: 'licencia_construccion',
    pass: {
      folio: 'LIC-2025-X9',
      vigencia_fecha: '2099-12-31',
      desarrollador_rfc: 'ABCD800101AB1',
    },
    fail: {
      folio: '',
      vigencia_fecha: '2099-12-31',
      desarrollador_rfc: 'ABCD800101AB1',
    },
  },
  {
    code: 'LIC_VIGENCIA',
    docType: 'licencia_construccion',
    pass: {
      folio: 'LIC-2025-X9',
      vigencia_fecha: '2099-12-31',
      desarrollador_rfc: 'ABCD800101AB1',
    },
    fail: {
      folio: 'LIC-2025-X9',
      vigencia_fecha: '2020-01-01',
      desarrollador_rfc: 'ABCD800101AB1',
    },
  },
  {
    code: 'LIC_DEV_RFC',
    docType: 'licencia_construccion',
    pass: {
      folio: 'LIC-2025-X9',
      vigencia_fecha: '2099-12-31',
      desarrollador_rfc: 'ABCD800101AB1',
    },
    fail: {
      folio: 'LIC-2025-X9',
      vigencia_fecha: '2099-12-31',
      desarrollador_rfc: 'invalid',
    },
  },
  // PREDIAL
  {
    code: 'PREDIAL_CUENTA_NUM',
    docType: 'predial',
    pass: {
      cuenta_predial: '123-456-789',
      adeudo_mxn: 0,
      ejercicio_fiscal: new Date().getFullYear(),
    },
    fail: { cuenta_predial: '', adeudo_mxn: 0, ejercicio_fiscal: new Date().getFullYear() },
  },
  {
    code: 'PREDIAL_AL_CORRIENTE',
    docType: 'predial',
    pass: {
      cuenta_predial: '123-456-789',
      adeudo_mxn: 0,
      ejercicio_fiscal: new Date().getFullYear(),
    },
    fail: {
      cuenta_predial: '123-456-789',
      adeudo_mxn: 5000,
      ejercicio_fiscal: new Date().getFullYear(),
    },
  },
  {
    code: 'PREDIAL_VIGENCIA',
    docType: 'predial',
    pass: {
      cuenta_predial: '123-456-789',
      adeudo_mxn: 0,
      ejercicio_fiscal: new Date().getFullYear(),
    },
    fail: { cuenta_predial: '123-456-789', adeudo_mxn: 0, ejercicio_fiscal: 2010 },
  },
  // BROCHURE
  {
    code: 'BROCH_PROYECTO_NOMBRE',
    docType: 'brochure',
    pass: { proyecto_nombre: 'Torre Reforma', ubicacion: 'CDMX', amenidades: ['gym'] },
    fail: { proyecto_nombre: '', ubicacion: 'CDMX', amenidades: ['gym'] },
  },
  {
    code: 'BROCH_UBICACION',
    docType: 'brochure',
    pass: { proyecto_nombre: 'Torre Reforma', ubicacion: 'CDMX', amenidades: ['gym'] },
    fail: { proyecto_nombre: 'Torre Reforma', ubicacion: '', amenidades: ['gym'] },
  },
  {
    code: 'BROCH_AMENIDADES',
    docType: 'brochure',
    pass: { proyecto_nombre: 'Torre Reforma', ubicacion: 'CDMX', amenidades: ['gym'] },
    fail: { proyecto_nombre: 'Torre Reforma', ubicacion: 'CDMX', amenidades: [] },
  },
  // PLANO_ARQUITECTONICO
  {
    code: 'PLANO_NIVELES',
    docType: 'planos_arquitectonicos',
    pass: { niveles: 8, m2_total: 4500 },
    fail: { niveles: 0, m2_total: 4500 },
  },
  {
    code: 'PLANO_M2_TOTAL',
    docType: 'planos_arquitectonicos',
    pass: { niveles: 8, m2_total: 4500 },
    fail: { niveles: 8, m2_total: 0 },
  },
  // CONTRATO_COMPRA_VENTA
  {
    code: 'CCV_PARTES',
    docType: 'contrato_compra_venta',
    pass: {
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
      precio_total_mxn: 5_000_000,
      fecha_firma: '2025-01-15',
    },
    fail: {
      partes: [{ nombre: 'A' }],
      precio_total_mxn: 5_000_000,
      fecha_firma: '2025-01-15',
    },
  },
  {
    code: 'CCV_PRECIO',
    docType: 'contrato_compra_venta',
    pass: {
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
      precio_total_mxn: 5_000_000,
      fecha_firma: '2025-01-15',
    },
    fail: {
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
      precio_total_mxn: 0,
      fecha_firma: '2025-01-15',
    },
  },
  {
    code: 'CCV_VIGENCIA',
    docType: 'contrato_compra_venta',
    pass: {
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
      precio_total_mxn: 5_000_000,
      fecha_firma: '2025-01-15',
    },
    fail: {
      partes: [
        { nombre: 'A', rfc: 'ABCD800101AB1' },
        { nombre: 'B', rfc: 'XYZW900101XY2' },
      ],
      precio_total_mxn: 5_000_000,
    },
  },
  // CONSTANCIA_SITUACION_FISCAL
  {
    code: 'CSF_RFC_VALID',
    docType: 'constancia_situacion_fiscal',
    pass: {
      rfc: 'ABCD800101AB1',
      regimen_fiscal: '601 General de Ley Personas Morales',
      fecha_emision: new Date().toISOString(),
    },
    fail: {
      rfc: 'invalid',
      regimen_fiscal: '601 General de Ley Personas Morales',
      fecha_emision: new Date().toISOString(),
    },
  },
  {
    code: 'CSF_REGIMEN',
    docType: 'constancia_situacion_fiscal',
    pass: {
      rfc: 'ABCD800101AB1',
      regimen_fiscal: '601 General de Ley Personas Morales',
      fecha_emision: new Date().toISOString(),
    },
    fail: {
      rfc: 'ABCD800101AB1',
      regimen_fiscal: '',
      fecha_emision: new Date().toISOString(),
    },
  },
  {
    code: 'CSF_VIGENCIA',
    docType: 'constancia_situacion_fiscal',
    pass: {
      rfc: 'ABCD800101AB1',
      regimen_fiscal: '601 General de Ley Personas Morales',
      fecha_emision: new Date().toISOString(),
    },
    fail: {
      rfc: 'ABCD800101AB1',
      regimen_fiscal: '601 General de Ley Personas Morales',
      fecha_emision: '2010-01-01',
    },
  },
];

describe('individual rule pass + fail cases', () => {
  for (const c of CASES) {
    it(`${c.code} passes when valid and fails when invalid`, () => {
      const passFindings = runValidation({ docType: c.docType, extracted: c.pass });
      expect(passFindings.find((f) => f.rule_code === c.code)).toBeUndefined();

      const failFindings = runValidation({ docType: c.docType, extracted: c.fail });
      expect(failFindings.find((f) => f.rule_code === c.code)).toBeDefined();
    });
  }
});

describe('getRulesForDocType', () => {
  it('returns only rules for given doc type', () => {
    const rules = getRulesForDocType('lista_precios');
    for (const rule of rules) {
      expect(rule.appliesTo).toContain('lista_precios');
    }
  });

  it('returns empty array for doc type without rules', () => {
    const rules = getRulesForDocType('foto_render');
    expect(rules).toEqual([]);
  });
});
