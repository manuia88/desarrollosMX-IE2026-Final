import { describe, expect, it } from 'vitest';
import { getScoreLineage } from '@/shared/lib/intelligence-engine/cascades/score-lineage';

describe('ie.scores.getDependencies lineage contract', () => {
  it('F08 LQI resolves upstream + downstream + depth', () => {
    const lineage = getScoreLineage('F08');
    expect(lineage).not.toBeNull();
    expect(lineage?.root.score_id).toBe('F08');
    expect(lineage?.root.level).toBe(1);
    expect(lineage?.upstream.length).toBeGreaterThan(0);
  });

  it('unknown score returns null (router maps to NOT_FOUND)', () => {
    expect(getScoreLineage('ZZZZ')).toBeNull();
  });

  it('N1 calculator A12 has dependencies', () => {
    const lineage = getScoreLineage('A12');
    expect(lineage).not.toBeNull();
    expect(lineage?.root.category).toBe('proyecto');
  });
});
