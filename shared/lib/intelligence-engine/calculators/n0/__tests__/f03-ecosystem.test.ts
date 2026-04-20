import { describe, expect, it } from 'vitest';
import { CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeF03Ecosystem, getLabelKey, methodology, version } from '../f03-ecosystem';

function anchorsFromFixture(zone: (typeof CDMX_ZONES)[number]) {
  return {
    clues_2do_nivel: zone.sources.dgis.clues_2do_nivel,
    siged_total_1km: zone.sources.siged.total_1km,
  };
}

describe('F03 Ecosystem DENUE calculator', () => {
  it('declara methodology DENUE + SCIAN', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('denue');
    expect(methodology.weights.shannon).toBe(25);
    expect(methodology.scian_mapping).toContain('scian');
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.f03.diversa_robusta');
    expect(getLabelKey(65, 'high')).toBe('ie.score.f03.diversa');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.f03.moderada');
    expect(getLabelKey(20, 'low')).toBe('ie.score.f03.limitada');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.f03.insufficient');
  });

  it('16 zonas CDMX — snapshot + confidence matches DENUE cascade', () => {
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; total: number; shannon: number }
    > = {};
    for (const zone of CDMX_ZONES) {
      const res = computeF03Ecosystem({
        total: zone.sources.denue.total,
        tier_counts: zone.sources.denue.tier_counts,
        by_macro_category: zone.sources.denue.by_macro_category,
        anchors: anchorsFromFixture(zone),
      });
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      const n = zone.sources.denue.total;
      const expectedConfidence =
        n >= 100 ? 'high' : n >= 20 ? 'medium' : n >= 1 ? 'low' : 'insufficient_data';
      expect(res.confidence, `${zone.zona_name} denue=${n}`).toBe(expectedConfidence);
      snapshot[zone.zona_name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        total: res.components.total,
        shannon: res.components.shannon,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('extremos: Polanco/Roma (premium+denso) > 65, Milpa Alta (rural) < 40', () => {
    const byName = (n: string) => {
      const f = CDMX_ZONES.find((z) => z.zona_name === n);
      if (!f) throw new Error(`${n} no encontrada`);
      return f;
    };
    const pol = computeF03Ecosystem({
      total: byName('Polanco').sources.denue.total,
      tier_counts: byName('Polanco').sources.denue.tier_counts,
      by_macro_category: byName('Polanco').sources.denue.by_macro_category,
      anchors: anchorsFromFixture(byName('Polanco')),
    });
    const roma = computeF03Ecosystem({
      total: byName('Roma Norte').sources.denue.total,
      tier_counts: byName('Roma Norte').sources.denue.tier_counts,
      by_macro_category: byName('Roma Norte').sources.denue.by_macro_category,
      anchors: anchorsFromFixture(byName('Roma Norte')),
    });
    const ma = computeF03Ecosystem({
      total: byName('Milpa Alta Centro').sources.denue.total,
      tier_counts: byName('Milpa Alta Centro').sources.denue.tier_counts,
      by_macro_category: byName('Milpa Alta Centro').sources.denue.by_macro_category,
      anchors: anchorsFromFixture(byName('Milpa Alta Centro')),
    });
    expect(pol.value, 'Polanco').toBeGreaterThan(65);
    expect(roma.value, 'Roma Norte').toBeGreaterThan(65);
    expect(ma.value, 'Milpa Alta').toBeLessThan(40);
  });

  it('Shannon: Polanco (diverse) > Tepito (retail-dominant)', () => {
    const byName = (n: string) => CDMX_ZONES.find((z) => z.zona_name === n);
    const polZone = byName('Polanco');
    const tepZone = byName('Tepito');
    if (!polZone || !tepZone) throw new Error('fixtures');
    const pol = computeF03Ecosystem({
      total: polZone.sources.denue.total,
      tier_counts: polZone.sources.denue.tier_counts,
      by_macro_category: polZone.sources.denue.by_macro_category,
      anchors: anchorsFromFixture(polZone),
    });
    const tep = computeF03Ecosystem({
      total: tepZone.sources.denue.total,
      tier_counts: tepZone.sources.denue.tier_counts,
      by_macro_category: tepZone.sources.denue.by_macro_category,
      anchors: anchorsFromFixture(tepZone),
    });
    expect(pol.components.shannon).toBeGreaterThan(tep.components.shannon);
  });

  it('anchor_presence true solo con hospital+uni+mall', () => {
    const withAnchors = computeF03Ecosystem({
      total: 250,
      tier_counts: { high: 60, standard: 120, basic: 70 },
      by_macro_category: { gastronomia: 60, retail: 80, salud: 30 },
      anchors: { clues_2do_nivel: 2, siged_total_1km: 5 },
    });
    expect(withAnchors.components.anchor_presence).toBe(true);
    expect(withAnchors.components.anchor_score).toBe(25);

    const noAnchors = computeF03Ecosystem({
      total: 50,
      tier_counts: { high: 5, standard: 25, basic: 20 },
      by_macro_category: { retail: 30, gastronomia: 15 },
      anchors: { clues_2do_nivel: 0, siged_total_1km: 2 },
    });
    expect(noAnchors.components.anchor_presence).toBe(false);
    expect(noAnchors.components.anchor_score).toBe(0);
  });
});
