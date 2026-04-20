import { describe, expect, it } from 'vitest';
import { computeB11Channel, getLabelKey, methodology, version } from '../b11-channel-performance';

describe('B11 Channel Performance', () => {
  it('declara methodology + sources', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('operaciones');
  });

  it('criterio done plan: Facebook 1000 leads/5 ops con spend conocido → ROI', () => {
    const res = computeB11Channel({
      channels: [
        {
          channel: 'facebook',
          leads: 1000,
          visits: 50,
          operations: 5,
          revenue_mxn: 5_000_000,
          spend_mxn: 1_000_000,
        },
        {
          channel: 'inmuebles24',
          leads: 500,
          visits: 30,
          operations: 3,
          revenue_mxn: 3_000_000,
          spend_mxn: 400_000,
        },
      ],
    });
    expect(res.components.channels).toHaveLength(2);
    const fb = res.components.channels.find((c) => c.channel === 'facebook');
    expect(fb?.roi_pct).toBeCloseTo(400, 0); // (5M-1M)/1M × 100
    expect(fb?.conversion_global).toBe(0.5); // 5/1000 × 100
  });

  it('ranking ordena por score desc', () => {
    const res = computeB11Channel({
      channels: [
        {
          channel: 'bajo',
          leads: 500,
          visits: 20,
          operations: 1,
          revenue_mxn: 500_000,
          spend_mxn: 400_000,
        },
        {
          channel: 'alto',
          leads: 300,
          visits: 30,
          operations: 5,
          revenue_mxn: 5_000_000,
          spend_mxn: 500_000,
        },
      ],
    });
    expect(res.components.top_channel).toBe('alto');
    expect(res.components.worst_channel).toBe('bajo');
  });

  it('sin channels → insufficient_data', () => {
    const res = computeB11Channel({ channels: [] });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('ops < 3 → confidence low', () => {
    const res = computeB11Channel({
      channels: [
        {
          channel: 'x',
          leads: 100,
          visits: 10,
          operations: 1,
          revenue_mxn: 500_000,
          spend_mxn: 200_000,
        },
      ],
    });
    expect(res.confidence).toBe('low');
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'medium')).toBe('ie.score.b11.excelente');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.b11.bueno');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.b11.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.b11.pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b11.insufficient');
  });
});
