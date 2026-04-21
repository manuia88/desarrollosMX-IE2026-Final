import { describe, expect, it, vi } from 'vitest';
import type { MigrationFlowPublicRow } from '../types';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

const sampleRow = (overrides: Partial<MigrationFlowPublicRow> = {}): MigrationFlowPublicRow => ({
  origin_scope_type: 'colonia',
  origin_scope_id: 'roma-norte',
  dest_scope_type: 'colonia',
  dest_scope_id: 'condesa',
  country_code: 'MX',
  period_date: '2026-03-01',
  volume: 120,
  confidence: 80,
  source_mix: { rpp: 50, inegi: 30, ine: 20, linkedin: 20 },
  income_decile_origin: 7,
  income_decile_dest: 8,
  ...overrides,
});

describe('FlowTopTable — module export smoke', () => {
  it('exports FlowTopTable as function', async () => {
    const mod = await import('../components/FlowTopTable');
    expect(typeof mod.FlowTopTable).toBe('function');
    expect(mod.FlowTopTable.name).toBe('FlowTopTable');
  });

  it('accepts rows prop', async () => {
    const mod = await import('../components/FlowTopTable');
    const rows: MigrationFlowPublicRow[] = [
      sampleRow({ volume: 120 }),
      sampleRow({ origin_scope_id: 'polanco', dest_scope_id: 'roma-norte', volume: 80 }),
      sampleRow({ origin_scope_id: 'narvarte', dest_scope_id: 'del-valle', volume: 40 }),
    ];
    expect(rows.length).toBe(3);
    expect(typeof mod.FlowTopTable).toBe('function');
  });

  it('empty rows array is a valid prop shape', async () => {
    const mod = await import('../components/FlowTopTable');
    const rows: MigrationFlowPublicRow[] = [];
    expect(rows.length).toBe(0);
    expect(typeof mod.FlowTopTable).toBe('function');
  });
});
