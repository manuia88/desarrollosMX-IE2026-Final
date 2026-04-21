import { describe, expect, it } from 'vitest';
import { PulseSimulator } from '../components/comprador/PulseSimulator';
import { ScoresGrid } from '../components/comprador/ScoresGrid';
import { TimelineChart } from '../components/comprador/TimelineChart';
import { getNarvarteMock } from '../lib/mock-data-provider';

// Smoke / shape tests. Aligned con los patrones de
// features/indices-publicos/tests/methodology-card.test.tsx — sin jsdom.
describe('features/preview-ux components (comprador)', () => {
  it('exporta ScoresGrid como componente función', () => {
    expect(typeof ScoresGrid).toBe('function');
    expect(ScoresGrid.name).toBe('ScoresGrid');
  });

  it('exporta PulseSimulator como componente función', () => {
    expect(typeof PulseSimulator).toBe('function');
    expect(PulseSimulator.name).toBe('PulseSimulator');
  });

  it('exporta TimelineChart como componente función', () => {
    expect(typeof TimelineChart).toBe('function');
    expect(TimelineChart.name).toBe('TimelineChart');
  });

  it('NARVARTE_MOCK tiene los 15 scores DMX que consume ScoresGrid', () => {
    const narvarte = getNarvarteMock();
    expect(narvarte.scores.length).toBe(15);
    for (const s of narvarte.scores) {
      expect(typeof s.code).toBe('string');
      expect(typeof s.value).toBe('number');
      expect(typeof s.percentile).toBe('number');
    }
  });

  it('NARVARTE_MOCK tiene 12 puntos de timeline con claves esperadas', () => {
    const narvarte = getNarvarteMock();
    expect(narvarte.timeline.length).toBe(12);
    for (const p of narvarte.timeline) {
      expect(typeof p.period).toBe('string');
      expect(typeof p.ipv).toBe('number');
      expect(typeof p.liv).toBe('number');
      expect(typeof p.fam).toBe('number');
      expect(typeof p.yng).toBe('number');
    }
  });

  it('NARVARTE_MOCK expone pulse + causal con la forma que PulseSimulator consume', () => {
    const narvarte = getNarvarteMock();
    expect(typeof narvarte.pulse.heartbeat).toBe('number');
    expect(typeof narvarte.pulse.vitals.appreciation).toBe('number');
    expect(typeof narvarte.pulse.vitals.liquidity).toBe('number');
    expect(typeof narvarte.pulse.vitals.demand).toBe('number');
    expect(typeof narvarte.pulse.vitals.momentum).toBe('number');
    expect(narvarte.causal.drivers.length).toBeGreaterThan(0);
    for (const d of narvarte.causal.drivers) {
      expect(typeof d.factor).toBe('string');
      expect(['positive', 'negative']).toContain(d.direction);
    }
  });
});
