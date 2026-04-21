import { describe, expect, it } from 'vitest';
import type { RankingRow } from '../components/RankingTable';
import { RankingTable } from '../components/RankingTable';

describe('features/indices-publicos/components/RankingTable', () => {
  it('exporta función componente', () => {
    expect(typeof RankingTable).toBe('function');
    expect(RankingTable.name).toBe('RankingTable');
  });

  it('acepta la forma RankingRow esperada', () => {
    const row: RankingRow = {
      scope_id: 'roma-norte',
      scope_type: 'colonia',
      index_code: 'IPV',
      value: 82.4,
      score_band: 'excelente',
      confidence: 'high',
      confidence_score: 0.94,
      ranking_in_scope: 1,
      percentile: 99,
      trend_direction: 'mejorando',
      trend_vs_previous: 1.23,
      period_date: '2026-03-01',
      methodology_version: 'v1.0',
    };
    expect(row.scope_id).toBe('roma-norte');
    expect(row.value).toBeGreaterThan(0);
  });

  it('tolera score_band null y trend_direction null (degradado)', () => {
    const row: RankingRow = {
      scope_id: 'unknown',
      scope_type: 'colonia',
      index_code: 'IPV',
      value: 55,
      score_band: null,
      confidence: 'medium',
      confidence_score: null,
      ranking_in_scope: null,
      percentile: null,
      trend_direction: null,
      trend_vs_previous: null,
      period_date: '2026-03-01',
      methodology_version: 'v1.0',
    };
    expect(row.score_band).toBeNull();
    expect(row.trend_direction).toBeNull();
  });
});
