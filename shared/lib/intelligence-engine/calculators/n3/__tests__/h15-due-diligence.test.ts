import { describe, expect, it } from 'vitest';
import {
  CHECKLIST_ITEMS,
  computeH15DueDiligence,
  getLabelKey,
  methodology,
  version,
} from '../h15-due-diligence';

describe('H15 Due Diligence', () => {
  it('declara 20 checklist items + categorías', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(CHECKLIST_ITEMS).toHaveLength(20);
    const cats = new Set(CHECKLIST_ITEMS.map((i) => i.category));
    expect(cats.has('legal')).toBe(true);
    expect(cats.has('tecnico')).toBe(true);
    expect(cats.has('financiero')).toBe(true);
  });

  it('criterio done plan: 18/20 verdes → score 90', () => {
    const items: Array<{ id: string; status: 'pass' | 'fail' | 'na' | 'pending' }> =
      CHECKLIST_ITEMS.slice(0, 18).map((i) => ({ id: i.id, status: 'pass' }));
    items.push({ id: CHECKLIST_ITEMS[18].id, status: 'fail' });
    items.push({ id: CHECKLIST_ITEMS[19].id, status: 'fail' });
    const res = computeH15DueDiligence({ items });
    // 18 / 20 = 90%. Pero si algún fail es crítico, cap a 40. Los últimos 2 del array son 'trust_dev' y 'estados_financieros' (no críticos).
    expect(res.value).toBe(90);
    expect(res.components.pass_count).toBe(18);
  });

  it('critical fail (legal) → cap a 40', () => {
    const items: Array<{ id: string; status: 'pass' | 'fail' | 'na' | 'pending' }> =
      CHECKLIST_ITEMS.map((i) => ({ id: i.id, status: 'pass' }));
    // Fallar sin_amparos (critical legal)
    items[3] = { id: 'sin_amparos', status: 'fail' };
    const res = computeH15DueDiligence({ items });
    expect(res.value).toBe(40);
    expect(res.components.capped).toBe(true);
    expect(res.components.critical_fails).toContain('sin_amparos');
  });

  it('todos pending → insufficient_data', () => {
    const items = CHECKLIST_ITEMS.map((i) => ({ id: i.id, status: 'pending' as const }));
    const res = computeH15DueDiligence({ items });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('por categoría cuenta correctamente', () => {
    const items = [
      { id: 'uso_suelo_compatible', status: 'pass' as const },
      { id: 'catastro_vigente', status: 'pass' as const },
      { id: 'avance_obra', status: 'fail' as const },
      { id: 'no_deudas_iva', status: 'pass' as const },
    ];
    const res = computeH15DueDiligence({ items });
    expect(res.components.by_category.legal.pass).toBe(2);
    expect(res.components.by_category.tecnico.fail).toBe(1);
    expect(res.components.by_category.financiero.pass).toBe(1);
  });

  it('status na no cuenta como pass ni fail', () => {
    const items = [
      { id: 'uso_suelo_compatible', status: 'pass' as const },
      { id: 'regimen_condominal', status: 'na' as const },
    ];
    const res = computeH15DueDiligence({ items });
    expect(res.components.applicable_count).toBe(1);
    expect(res.components.na_count).toBe(1);
    expect(res.value).toBe(100);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(95, 'high')).toBe('ie.score.h15.excelente');
    expect(getLabelKey(75, 'medium')).toBe('ie.score.h15.aceptable');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.h15.observaciones');
    expect(getLabelKey(20, 'low')).toBe('ie.score.h15.bloqueante');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.h15.insufficient');
  });

  it('methodology critical_fail_cap = 40', () => {
    expect(methodology.critical_fail_cap).toBe(40);
  });
});
