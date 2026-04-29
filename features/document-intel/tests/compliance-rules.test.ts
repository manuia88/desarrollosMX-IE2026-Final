import { describe, expect, it } from 'vitest';
import type { DocType } from '@/features/document-intel/schemas/validation';
import { COMPLIANCE_RULES, evaluateRule, fuzzyMatch } from '../lib/compliance-rules';

function ruleByCode(code: string) {
  const r = COMPLIANCE_RULES.find((x) => x.code === code);
  if (!r) throw new Error(`rule_not_found:${code}`);
  return r;
}

function buildDocs(
  entries: Array<[DocType, Record<string, unknown>]>,
): Map<DocType, Record<string, unknown>> {
  return new Map(entries);
}

describe('compliance-rules', () => {
  describe('CC_UNIDADES_COUNT', () => {
    it('detecta mismatch permiso 50 vs LP 60', () => {
      const r = ruleByCode('CC_UNIDADES_COUNT');
      const docs = buildDocs([
        ['permiso_seduvi', { total_unidades: 50 }],
        ['lista_precios', { unidades: Array.from({ length: 60 }, (_, i) => ({ id: i })) }],
      ]);
      const finding = evaluateRule(r, docs);
      expect(finding).not.toBeNull();
      expect(finding?.severity).toBe('critical');
      expect(finding?.conflicting_data.permiso_seduvi_unidades).toBe(50);
      expect(finding?.conflicting_data.lista_precios_unidades).toBe(60);
    });

    it('no genera finding si counts iguales', () => {
      const r = ruleByCode('CC_UNIDADES_COUNT');
      const docs = buildDocs([
        ['permiso_seduvi', { total_unidades: 50 }],
        ['lista_precios', { unidades: Array.from({ length: 50 }, (_, i) => ({ id: i })) }],
      ]);
      expect(evaluateRule(r, docs)).toBeNull();
    });

    it('no genera finding si falta uno de los doc requeridos', () => {
      const r = ruleByCode('CC_UNIDADES_COUNT');
      const docs = buildDocs([['lista_precios', { unidades: [] }]]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('CC_M2_TOTAL', () => {
    it('warning si diff >2%', () => {
      const r = ruleByCode('CC_M2_TOTAL');
      const docs = buildDocs([
        ['permiso_seduvi', { m2_total_construccion: 1000 }],
        ['lista_precios', { m2_total_construccion: 1100 }],
      ]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('warning');
    });

    it('no warning si diff <=2%', () => {
      const r = ruleByCode('CC_M2_TOTAL');
      const docs = buildDocs([
        ['permiso_seduvi', { m2_total_construccion: 1000 }],
        ['lista_precios', { m2_total_construccion: 1015 }],
      ]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('CC_PREDIO_AREA', () => {
    it('critical si diff >5%', () => {
      const r = ruleByCode('CC_PREDIO_AREA');
      const docs = buildDocs([
        ['predial', { area_predio_m2: 1000 }],
        ['escritura', { area_predio_m2: 1100 }],
      ]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('critical');
    });

    it('no finding si diff <=5%', () => {
      const r = ruleByCode('CC_PREDIO_AREA');
      const docs = buildDocs([
        ['predial', { area_predio_m2: 1000 }],
        ['escritura', { area_predio_m2: 1040 }],
      ]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('CC_VIGENCIA_PERMISO', () => {
    it('warning si gap >365d', () => {
      const r = ruleByCode('CC_VIGENCIA_PERMISO');
      const docs = buildDocs([
        ['permiso_seduvi', { vigencia_fin: '2024-01-01' }],
        ['licencia_construccion', { fecha_emision: '2026-01-01' }],
      ]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('warning');
    });

    it('no finding si gap pequeño', () => {
      const r = ruleByCode('CC_VIGENCIA_PERMISO');
      const docs = buildDocs([
        ['permiso_seduvi', { vigencia_fin: '2026-01-01' }],
        ['licencia_construccion', { fecha_emision: '2026-03-01' }],
      ]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('CC_RFC_CONSISTENCY', () => {
    it('warning si RFC mismatch entre escritura y predial', () => {
      const r = ruleByCode('CC_RFC_CONSISTENCY');
      const docs = buildDocs([
        ['escritura', { rfc_propietario: 'XAXX010101000' }],
        ['predial', { rfc_propietario: 'YBYY020202111' }],
      ]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('warning');
    });

    it('no finding si RFC consistente', () => {
      const r = ruleByCode('CC_RFC_CONSISTENCY');
      const docs = buildDocs([
        ['escritura', { rfc: 'XAXX010101000' }],
        ['predial', { rfc: 'XAXX010101000' }],
      ]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('CC_NOTARIO_VALID', () => {
    it('info si falta notario_num', () => {
      const r = ruleByCode('CC_NOTARIO_VALID');
      const docs = buildDocs([['escritura', { notario_name: 'Lic. Juan Pérez' }]]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('info');
    });

    it('info si falta notario_name', () => {
      const r = ruleByCode('CC_NOTARIO_VALID');
      const docs = buildDocs([['escritura', { notario_num: 42 }]]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('info');
    });

    it('no finding si ambos presentes y válidos', () => {
      const r = ruleByCode('CC_NOTARIO_VALID');
      const docs = buildDocs([['escritura', { notario_num: 42, notario_name: 'Lic. Juan Pérez' }]]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('CC_DIRECCION_MATCH', () => {
    it('warning si fuzzy <0.7', () => {
      const r = ruleByCode('CC_DIRECCION_MATCH');
      const docs = buildDocs([
        ['predial', { direccion: 'Av. Reforma 123 Col Centro' }],
        ['escritura', { ubicacion: 'Calle Madero 8 Polanco' }],
      ]);
      const finding = evaluateRule(r, docs);
      expect(finding?.severity).toBe('warning');
    });

    it('no finding si fuzzy >=0.7', () => {
      const r = ruleByCode('CC_DIRECCION_MATCH');
      const docs = buildDocs([
        ['predial', { direccion: 'Av Reforma 123 Col Centro CDMX' }],
        ['escritura', { ubicacion: 'Av Reforma 123 Col Centro Cdmx' }],
      ]);
      expect(evaluateRule(r, docs)).toBeNull();
    });
  });

  describe('fuzzyMatch', () => {
    it('returns 1 for identical strings (after normalization)', () => {
      expect(fuzzyMatch('Hola Mundo', 'hola mundo')).toBe(1);
    });

    it('returns 0 for empty strings', () => {
      expect(fuzzyMatch('', 'foo')).toBe(0);
      expect(fuzzyMatch('foo', '')).toBe(0);
    });

    it('returns >0 <1 for partial overlap', () => {
      const sim = fuzzyMatch('Av Reforma 123', 'Av Reforma 124');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });
  });
});
