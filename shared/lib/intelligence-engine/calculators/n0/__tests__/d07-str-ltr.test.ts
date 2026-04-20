import { describe, expect, it } from 'vitest';
import { CDMX_AIRROI, CDMX_ZONES } from '../../../__fixtures__/cdmx-zones';
import { computeD07StrLtr, getLabelKey, methodology, version } from '../d07-str-ltr';

function regimeFromAirroi(
  adr: number,
  occupancy: number,
): {
  regime: 'str_strongly_outperforms' | 'str_outperforms' | 'parity' | 'ltr_outperforms' | 'unknown';
  ratio: number | null;
} {
  const revpar = adr * (occupancy / 100);
  // LTR baseline: precio_renta_mensual ≈ 20-30 USD/noche equivalent.
  const ltrBaseline = 25; // USD/día equivalente
  const ratio = ltrBaseline > 0 ? revpar / ltrBaseline : null;
  if (!ratio) return { regime: 'unknown', ratio };
  if (ratio >= 3.0) return { regime: 'str_strongly_outperforms', ratio };
  if (ratio >= 1.5) return { regime: 'str_outperforms', ratio };
  if (ratio >= 0.8) return { regime: 'parity', ratio };
  return { regime: 'ltr_outperforms', ratio };
}

describe('D07 STR vs LTR calculator (wrapper sobre str-intelligence)', () => {
  it('declara methodology AirROI (ADR-019 no AirDNA) + reusa str-intelligence', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toEqual(expect.arrayContaining(['airroi', 'v_ltr_str_connection']));
    expect(methodology.references.map((r) => r.name)).toContain('AirROI');
  });

  it('getLabelKey mapea umbrales STR/LTR', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.d07.str_favorece');
    expect(getLabelKey(60, 'high')).toBe('ie.score.d07.str_moderado');
    expect(getLabelKey(35, 'medium')).toBe('ie.score.d07.paridad');
    expect(getLabelKey(15, 'low')).toBe('ie.score.d07.ltr_favorece');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.d07.insufficient');
  });

  it('16 zonas CDMX — snapshot basado en CDMX_AIRROI', () => {
    const snapshot: Record<string, { value: number; regime: string; ratio: number | null }> = {};
    for (const zone of CDMX_ZONES) {
      const airroi = CDMX_AIRROI[zone.zona_name];
      if (!airroi) throw new Error(`AIRROI ${zone.zona_name} missing`);
      const { regime, ratio } = regimeFromAirroi(airroi.adr_usd, airroi.occupancy_pct);
      const res = computeD07StrLtr({
        regime,
        str_ltr_ratio: ratio,
        str_sample_months: 12,
        ltr_sample_listings: airroi.listings_count,
      });
      expect(res.value, zone.zona_name).toBeGreaterThanOrEqual(0);
      expect(res.value, zone.zona_name).toBeLessThanOrEqual(100);
      snapshot[zone.zona_name] = {
        value: res.value,
        regime: res.components.regime,
        ratio: res.components.ratio,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('criterio plan: Roma Norte (ADR>$180) → score STR>LTR (favorece STR)', () => {
    const roma = CDMX_AIRROI['Roma Norte'];
    if (!roma) throw new Error('fixture');
    const { regime, ratio } = regimeFromAirroi(roma.adr_usd, roma.occupancy_pct);
    const res = computeD07StrLtr({
      regime,
      str_ltr_ratio: ratio,
      str_sample_months: 12,
      ltr_sample_listings: roma.listings_count,
    });
    expect(res.value).toBeGreaterThan(50);
    expect(['str_outperforms', 'str_strongly_outperforms']).toContain(res.components.regime);
  });

  it('unknown regime + 0 samples → insufficient_data', () => {
    const res = computeD07StrLtr({
      regime: 'unknown',
      str_ltr_ratio: null,
      str_sample_months: 0,
      ltr_sample_listings: 0,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('ltr_outperforms con confianza → score 20±algo', () => {
    const res = computeD07StrLtr({
      regime: 'ltr_outperforms',
      str_ltr_ratio: 0.5,
      str_sample_months: 12,
      ltr_sample_listings: 30,
    });
    expect(res.components.regime).toBe('ltr_outperforms');
    expect(res.value).toBeGreaterThan(10);
    expect(res.value).toBeLessThan(40);
  });
});
