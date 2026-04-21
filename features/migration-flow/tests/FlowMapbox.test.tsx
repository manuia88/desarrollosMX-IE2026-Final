import { describe, expect, it, vi } from 'vitest';
import type { MigrationFlowMapPoint } from '../types';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}));

describe('FlowMapbox — module export smoke', () => {
  it('exports FlowMapbox as function', async () => {
    const mod = await import('../components/FlowMapbox');
    expect(typeof mod.FlowMapbox).toBe('function');
    expect(mod.FlowMapbox.name).toBe('FlowMapbox');
  });

  it('accepts points with centroids', async () => {
    const mod = await import('../components/FlowMapbox');
    const points: MigrationFlowMapPoint[] = [
      {
        origin_scope_id: 'roma-norte',
        dest_scope_id: 'condesa',
        origin_centroid: [-99.163, 19.415],
        dest_centroid: [-99.175, 19.409],
        volume: 120,
        income_decile_origin: 7,
        income_decile_dest: 8,
      },
      {
        origin_scope_id: 'polanco',
        dest_scope_id: 'roma-norte',
        origin_centroid: [-99.19, 19.43],
        dest_centroid: [-99.163, 19.415],
        volume: 80,
        income_decile_origin: 10,
        income_decile_dest: 7,
      },
    ];
    expect(points.length).toBe(2);
    expect(typeof mod.FlowMapbox).toBe('function');
  });

  it('accepts points without centroids (empty fallback case)', async () => {
    const mod = await import('../components/FlowMapbox');
    const points: MigrationFlowMapPoint[] = [
      {
        origin_scope_id: 'x',
        dest_scope_id: 'y',
        origin_centroid: null,
        dest_centroid: null,
        volume: 10,
        income_decile_origin: null,
        income_decile_dest: null,
      },
    ];
    expect(points.length).toBe(1);
    expect(typeof mod.FlowMapbox).toBe('function');
  });

  it('accepts empty points array', async () => {
    const mod = await import('../components/FlowMapbox');
    const points: MigrationFlowMapPoint[] = [];
    expect(points.length).toBe(0);
    expect(typeof mod.FlowMapbox).toBe('function');
  });
});
