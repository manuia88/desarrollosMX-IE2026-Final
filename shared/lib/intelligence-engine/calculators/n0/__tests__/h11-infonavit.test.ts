import { describe, expect, it } from 'vitest';
import {
  computeH11Infonavit,
  getLabelKey,
  MONTO_MAX_ABS_MXN_2026,
  methodology,
  TASA_PROMEDIO_2026,
  VSM_MENSUAL_MXN_2026,
  version,
} from '../h11-infonavit';

describe('H11 Infonavit Calculator', () => {
  it('declara methodology + tablas 2026', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('infonavit_tables_2026');
    expect(VSM_MENSUAL_MXN_2026).toBeGreaterThan(8000);
    expect(TASA_PROMEDIO_2026).toBe(0.1);
    expect(MONTO_MAX_ABS_MXN_2026).toBe(2_500_000);
  });

  it('getLabelKey mapea umbrales capacidad', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h11.capacidad_alta');
    expect(getLabelKey(55, 'high')).toBe('ie.score.h11.capacidad_media');
    expect(getLabelKey(25, 'medium')).toBe('ie.score.h11.capacidad_baja');
    expect(getLabelKey(10, 'low')).toBe('ie.score.h11.capacidad_minima');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h11.insufficient');
  });

  it('criterio plan: salario 20 VSM, 35 años, 5 años antig → crédito máx ~1.5M ±5%', () => {
    const res = computeH11Infonavit({
      salario_mensual_vsm: 20,
      edad: 35,
      antiguedad_vsm: 5,
    });
    const expected = 1_547_000; // calculated per formula
    const delta_pct = Math.abs(res.components.monto_credito_max_mxn - expected) / expected;
    expect(delta_pct, `monto=${res.components.monto_credito_max_mxn}`).toBeLessThan(0.05);
    expect(res.confidence).toBe('high');
  });

  it('edad joven aumenta credit, edad mayor decreases', () => {
    const joven = computeH11Infonavit({
      salario_mensual_vsm: 15,
      edad: 28,
      antiguedad_vsm: 3,
    });
    const mayor = computeH11Infonavit({
      salario_mensual_vsm: 15,
      edad: 55,
      antiguedad_vsm: 3,
    });
    expect(joven.components.monto_credito_max_mxn).toBeGreaterThan(
      mayor.components.monto_credito_max_mxn,
    );
  });

  it('monto respeta tope 2.5M (salario alto)', () => {
    const res = computeH11Infonavit({
      salario_mensual_vsm: 100,
      edad: 25,
      antiguedad_vsm: 10,
    });
    expect(res.components.monto_credito_max_mxn).toBe(MONTO_MAX_ABS_MXN_2026);
    expect(res.value).toBe(100);
  });

  it('mensualidad_estimada es ~1.2% del monto (amortización 20y)', () => {
    const res = computeH11Infonavit({
      salario_mensual_vsm: 20,
      edad: 35,
      antiguedad_vsm: 5,
    });
    const ratio = res.components.mensualidad_estimada_mxn / res.components.monto_credito_max_mxn;
    expect(ratio).toBeCloseTo(0.012, 3);
  });

  it('edad <18 o >64 → insufficient_data', () => {
    expect(
      computeH11Infonavit({ salario_mensual_vsm: 20, edad: 17, antiguedad_vsm: 1 }).confidence,
    ).toBe('insufficient_data');
    expect(
      computeH11Infonavit({ salario_mensual_vsm: 20, edad: 65, antiguedad_vsm: 1 }).confidence,
    ).toBe('insufficient_data');
  });
});
