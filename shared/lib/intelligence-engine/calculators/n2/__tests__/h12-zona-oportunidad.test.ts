import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import h12, {
  CATEGORIA_THRESHOLDS,
  CRITICAL_DEPS,
  computeH12ZonaOportunidad,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
  WEIGHTS,
} from '../h12-zona-oportunidad';

describe('H12 Zona Oportunidad calculator', () => {
  it('declara version, methodology, reasoning_template, sensitivity_analysis D14', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('zone_scores:F09');
    expect(methodology.sources).toContain('zone_scores:N11');
    expect(methodology.sources).toContain('zone_scores:A04');
    expect(WEIGHTS.f09_value).toBe(0.4);
    expect(WEIGHTS.n11_momentum).toBe(0.35);
    expect(WEIGHTS.a04_arbitrage).toBe(0.25);
    // Suma pesos = 1
    expect(WEIGHTS.f09_value + WEIGHTS.n11_momentum + WEIGHTS.a04_arbitrage).toBeCloseTo(1, 5);
    expect(CRITICAL_DEPS).toContain('F09');
    expect(CRITICAL_DEPS).toContain('N11');
    expect(CRITICAL_DEPS).not.toContain('A04');
    expect(methodology.sensitivity_analysis.length).toBe(3);
    expect(methodology.sensitivity_analysis[0]).toHaveProperty('dimension_id');
    expect(methodology.sensitivity_analysis[0]).toHaveProperty('impact_pct_per_10pct_change');
    expect(reasoning_template).toContain('{f09}');
    expect(reasoning_template).toContain('{n11}');
    expect(reasoning_template).toContain('{categoria}');
    expect(reasoning_template).toContain('{confidence}');
    expect(CATEGORIA_THRESHOLDS.oportunidad_alta).toBe(75);
    expect(CATEGORIA_THRESHOLDS.oportunidad_media).toBe(55);
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h12.oportunidad_alta');
    expect(getLabelKey(60, 'high')).toBe('ie.score.h12.oportunidad_media');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.h12.estable');
    expect(getLabelKey(20, 'low')).toBe('ie.score.h12.declive');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.h12.insufficient');
  });

  it('criterio done FASE 10.A.13 — Narvarte top ranking "oportunidad_alta"', () => {
    // Narvarte: F09=80 (buen valor), N11=75 (momentum alto), A04=70 (arbitrage)
    // score = 80·0.40 + 75·0.35 + 70·0.25 = 32 + 26.25 + 17.5 = 75.75 → 76
    const res = computeH12ZonaOportunidad({
      f09: 80,
      n11: 75,
      a04: 70,
      ranking_context: { position: 3, total: 100 },
    });
    expect(res.value).toBeGreaterThanOrEqual(CATEGORIA_THRESHOLDS.oportunidad_alta);
    expect(res.components.categoria).toBe('oportunidad_alta');
    expect(res.components.ranking_nacional).not.toBeNull();
    // Position 3 de 100 → percentile top 98%
    expect(res.components.ranking_nacional?.percentile).toBe(98);
    expect(res.components.ranking_nacional?.position).toBe(3);
    expect(res.components.ranking_nacional?.total).toBe(100);
  });

  it('fórmula: score compuesto con pesos correctos F09 40% + N11 35% + A04 25%', () => {
    // Todos 100 → score 100
    const allHigh = computeH12ZonaOportunidad({ f09: 100, n11: 100, a04: 100 });
    expect(allHigh.value).toBe(100);

    // Todos 50 → score 50
    const allMid = computeH12ZonaOportunidad({ f09: 50, n11: 50, a04: 50 });
    expect(allMid.value).toBe(50);

    // Verificar peso: solo F09=100, N11=0, A04=0 → 40
    const soloF09 = computeH12ZonaOportunidad({ f09: 100, n11: 0, a04: 0 });
    expect(soloF09.value).toBe(40);

    // Solo N11=100 → 35
    const soloN11 = computeH12ZonaOportunidad({ f09: 0, n11: 100, a04: 0 });
    expect(soloN11.value).toBe(35);

    // Solo A04=100 → 25
    const soloA04 = computeH12ZonaOportunidad({ f09: 0, n11: 0, a04: 100 });
    expect(soloA04.value).toBe(25);
  });

  it('categorías: alta/media/estable/declive según thresholds', () => {
    expect(computeH12ZonaOportunidad({ f09: 90, n11: 90, a04: 90 }).components.categoria).toBe(
      'oportunidad_alta',
    );
    expect(computeH12ZonaOportunidad({ f09: 60, n11: 60, a04: 60 }).components.categoria).toBe(
      'oportunidad_media',
    );
    expect(computeH12ZonaOportunidad({ f09: 40, n11: 40, a04: 40 }).components.categoria).toBe(
      'estable',
    );
    expect(computeH12ZonaOportunidad({ f09: 20, n11: 20, a04: 20 }).components.categoria).toBe(
      'declive',
    );
  });

  it('D13 MATRIZ propagación confidence — F09 low → H12 cap ≤ medium (no high)', () => {
    // F09 crítica con confidence=low. Aunque coverage=100%, H12 no puede ser high.
    const res = computeH12ZonaOportunidad({
      f09: 80,
      n11: 75,
      a04: 70,
      deps: [
        { scoreId: 'F09', confidence: 'low' },
        { scoreId: 'N11', confidence: 'high' },
        { scoreId: 'A04', confidence: 'high' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(['low', 'medium']).toContain(res.confidence);
  });

  it('D13 MATRIZ — F09 medium + N11 high + A04 high → H12 cap medium', () => {
    const res = computeH12ZonaOportunidad({
      f09: 80,
      n11: 80,
      a04: 80,
      deps: [
        { scoreId: 'F09', confidence: 'medium' },
        { scoreId: 'N11', confidence: 'high' },
        { scoreId: 'A04', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('medium');
  });

  it('D13 MATRIZ — F09 insufficient_data → H12 = insufficient_data (fail propagation)', () => {
    const res = computeH12ZonaOportunidad({
      f09: 50,
      n11: 75,
      a04: 70,
      deps: [
        { scoreId: 'F09', confidence: 'insufficient_data' },
        { scoreId: 'N11', confidence: 'high' },
        { scoreId: 'A04', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('F09');
  });

  it('D13 MATRIZ — todas críticas high + A04 supporting low → H12 podría ser medium (A04 worst)', () => {
    // A04 es supporting → worst contribuye al compose pero no cap crítico.
    const res = computeH12ZonaOportunidad({
      f09: 80,
      n11: 80,
      a04: 80,
      deps: [
        { scoreId: 'F09', confidence: 'high' },
        { scoreId: 'N11', confidence: 'high' },
        { scoreId: 'A04', confidence: 'low' }, // supporting
      ],
    });
    // Worst de lista = low (A04), pero A04 no crítica. La regla compone worst.
    // El score resultante se ajusta al peor global de la lista cuando no hay critical
    // con menor confidence; test valida no crashea y no es insufficient.
    expect(res.confidence).not.toBe('insufficient_data');
  });

  it('critical dep F09 faltante (null) → insufficient_data', () => {
    const res = computeH12ZonaOportunidad({ f09: null, n11: 75, a04: 70 });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.capped_by).toContain('F09');
    expect(res.components.cap_reason).toBe('critical_dependency_missing');
  });

  it('critical dep N11 faltante → insufficient_data + capped_by N11', () => {
    const res = computeH12ZonaOportunidad({ f09: 80, n11: null, a04: 70 });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.capped_by).toContain('N11');
  });

  it('A04 supporting faltante → score computado con A04=0, confidence cap medium por coverage', () => {
    const res = computeH12ZonaOportunidad({ f09: 80, n11: 75, a04: null });
    // A04=0 → score = 80·0.40 + 75·0.35 + 0 = 32 + 26.25 = 58.25 → 58
    expect(res.value).toBe(58);
    expect(res.components.categoria).toBe('oportunidad_media');
    expect(res.components.missing_dimensions).toContain('A04_arbitrage');
    // Coverage 66% (2/3) → no high sin deps override; medium
    expect(res.confidence).toBe('medium');
  });

  it('ranking_nacional: percentile calculado correctamente (top=100, último=1)', () => {
    const top = computeH12ZonaOportunidad({
      f09: 90,
      n11: 90,
      a04: 90,
      ranking_context: { position: 1, total: 50 },
    });
    expect(top.components.ranking_nacional?.percentile).toBe(100);

    const last = computeH12ZonaOportunidad({
      f09: 90,
      n11: 90,
      a04: 90,
      ranking_context: { position: 50, total: 50 },
    });
    expect(last.components.ranking_nacional?.percentile).toBe(2);

    const noCtx = computeH12ZonaOportunidad({ f09: 90, n11: 90, a04: 90 });
    expect(noCtx.components.ranking_nacional).toBeNull();
  });

  it('h12.run() prod-path devuelve insufficient sin params + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await h12.run(
      { zoneId: 'narvarte', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.h12.insufficient');
    expect(out.provenance.calculator_version).toBe(version);
    expect(out.valid_until).toBeTruthy();
  });
});
