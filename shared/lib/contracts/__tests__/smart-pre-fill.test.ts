import { describe, expect, it } from 'vitest';
import { _computeMontosForTest } from '../smart-pre-fill';

const baseEsquema = {
  id: 'esq-1',
  nombre: 'Test',
  enganche_pct: 0,
  mensualidades_count: 0,
  contra_entrega_pct: 100,
  comision_pct: 4,
  iva_calc_logic: 'on_commission',
  meses_gracia: 0,
  financing_partner: null,
};

describe('smart-pre-fill computeMontos', () => {
  it('contado scenario: 100% contra entrega + IVA on commission', () => {
    const m = _computeMontosForTest(2_000_000, baseEsquema);
    expect(m.precio_unidad_mxn).toBe(2_000_000);
    expect(m.enganche_mxn).toBe(0);
    expect(m.contra_entrega_mxn).toBe(2_000_000);
    expect(m.mensualidad_mxn).toBe(0);
    expect(m.comision_asesor_mxn).toBe(80_000);
    expect(m.iva_mxn).toBe(12_800);
    expect(m.total_mxn).toBe(2_012_800);
  });

  it('24 MSI scenario: 20% enganche + 24 mensualidades + 0% contra entrega', () => {
    const m = _computeMontosForTest(3_000_000, {
      ...baseEsquema,
      enganche_pct: 20,
      mensualidades_count: 24,
      contra_entrega_pct: 0,
      comision_pct: 5,
      iva_calc_logic: 'no_iva',
    });
    expect(m.enganche_mxn).toBe(600_000);
    expect(m.contra_entrega_mxn).toBe(0);
    expect(m.mensualidad_mxn).toBe(100_000);
    expect(m.comision_asesor_mxn).toBe(150_000);
    expect(m.iva_mxn).toBe(0);
    expect(m.total_mxn).toBe(3_000_000);
  });

  it('financing 18m scenario: 30% enganche + 18 MSI + 50% contra entrega', () => {
    const m = _computeMontosForTest(4_500_000, {
      ...baseEsquema,
      enganche_pct: 30,
      mensualidades_count: 18,
      contra_entrega_pct: 50,
      comision_pct: 4,
      iva_calc_logic: 'on_commission',
    });
    expect(m.enganche_mxn).toBe(1_350_000);
    expect(m.contra_entrega_mxn).toBe(2_250_000);
    expect(m.mensualidad_mxn).toBe(50_000);
    expect(m.comision_asesor_mxn).toBe(180_000);
    expect(m.iva_mxn).toBe(28_800);
    expect(m.total_mxn).toBe(4_528_800);
  });
});
