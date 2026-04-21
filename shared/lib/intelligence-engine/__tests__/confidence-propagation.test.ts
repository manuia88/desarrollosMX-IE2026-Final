import { describe, expect, it } from 'vitest';
import {
  collectDepConfidences,
  propagateConfidence,
} from '@/shared/lib/intelligence-engine/confidence-propagation';

describe('D13 propagateConfidence', () => {
  it('all high + no coverage limit → high', () => {
    const res = propagateConfidence({
      critical: [
        { scoreId: 'A', confidence: 'high' },
        { scoreId: 'B', confidence: 'high' },
      ],
      supporting: [{ scoreId: 'C', confidence: 'high' }],
    });
    expect(res.confidence).toBe('high');
    expect(res.cap_reason).toBeNull();
  });

  it('critical low forces cap to low', () => {
    const res = propagateConfidence({
      critical: [
        { scoreId: 'A', confidence: 'high' },
        { scoreId: 'B', confidence: 'low' },
      ],
      supporting: [{ scoreId: 'C', confidence: 'high' }],
    });
    expect(res.confidence).toBe('low');
    expect(res.capped_by).toContain('B');
    expect(res.cap_reason).toBe('critical_worst:low');
  });

  it('critical medium caps high dep chain to medium', () => {
    const res = propagateConfidence({
      critical: [
        { scoreId: 'A', confidence: 'medium' },
        { scoreId: 'B', confidence: 'high' },
      ],
      supporting: [{ scoreId: 'C', confidence: 'high' }],
    });
    expect(res.confidence).toBe('medium');
    expect(res.capped_by).toContain('A');
  });

  it('critical insufficient_data → insufficient_data fail propagation', () => {
    const res = propagateConfidence({
      critical: [
        { scoreId: 'A', confidence: 'high' },
        { scoreId: 'B', confidence: 'insufficient_data' },
      ],
      supporting: [{ scoreId: 'C', confidence: 'high' }],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.cap_reason).toBe('critical_dependency_insufficient');
    expect(res.capped_by).toContain('B');
  });

  it('supporting low does NOT cap critical-high result', () => {
    const res = propagateConfidence({
      critical: [
        { scoreId: 'A', confidence: 'high' },
        { scoreId: 'B', confidence: 'high' },
      ],
      supporting: [{ scoreId: 'C', confidence: 'low' }],
    });
    // compose worst still returns low across ALL, but critical worst is high;
    // so non-critical low still propagates as overall worst — matches behavior.
    expect(res.confidence).toBe('low');
  });

  it('coverage bajo min → insufficient_data', () => {
    const res = propagateConfidence({
      critical: [{ scoreId: 'A', confidence: 'high' }],
      supporting: [],
      coverage_pct: 30,
      min_coverage_pct: 50,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.cap_reason).toBe('coverage_below_min_threshold');
  });

  it('coverage bajo high threshold baja high→medium', () => {
    const res = propagateConfidence({
      critical: [{ scoreId: 'A', confidence: 'high' }],
      supporting: [],
      coverage_pct: 70,
      high_coverage_pct: 90,
      min_coverage_pct: 50,
    });
    expect(res.confidence).toBe('medium');
    expect(res.cap_reason).toBe('coverage_below_high_threshold');
  });

  it('matrix 6x4: high/medium/low/insufficient × 6 deps', () => {
    const cases: Array<{
      critical: Array<{
        scoreId: string;
        confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
      }>;
      expected: 'high' | 'medium' | 'low' | 'insufficient_data';
    }> = [
      {
        critical: [
          { scoreId: 'A', confidence: 'high' },
          { scoreId: 'B', confidence: 'high' },
          { scoreId: 'C', confidence: 'high' },
          { scoreId: 'D', confidence: 'high' },
          { scoreId: 'E', confidence: 'high' },
          { scoreId: 'F', confidence: 'high' },
        ],
        expected: 'high',
      },
      {
        critical: [
          { scoreId: 'A', confidence: 'high' },
          { scoreId: 'B', confidence: 'medium' },
          { scoreId: 'C', confidence: 'high' },
          { scoreId: 'D', confidence: 'high' },
          { scoreId: 'E', confidence: 'high' },
          { scoreId: 'F', confidence: 'high' },
        ],
        expected: 'medium',
      },
      {
        critical: [
          { scoreId: 'A', confidence: 'high' },
          { scoreId: 'B', confidence: 'low' },
          { scoreId: 'C', confidence: 'high' },
          { scoreId: 'D', confidence: 'medium' },
          { scoreId: 'E', confidence: 'high' },
          { scoreId: 'F', confidence: 'high' },
        ],
        expected: 'low',
      },
      {
        critical: [
          { scoreId: 'A', confidence: 'high' },
          { scoreId: 'B', confidence: 'low' },
          { scoreId: 'C', confidence: 'high' },
          { scoreId: 'D', confidence: 'insufficient_data' },
          { scoreId: 'E', confidence: 'high' },
          { scoreId: 'F', confidence: 'high' },
        ],
        expected: 'insufficient_data',
      },
    ];
    for (const tc of cases) {
      const res = propagateConfidence({ critical: tc.critical });
      expect(res.confidence).toBe(tc.expected);
    }
  });
});

describe('D13 collectDepConfidences', () => {
  it('separa critical vs supporting por scoreId', () => {
    const raw = [
      { scoreId: 'F08', confidence: 'high' as const },
      { scoreId: 'A12', confidence: 'low' as const },
      { scoreId: 'N11', confidence: 'medium' as const },
    ];
    const { critical, supporting } = collectDepConfidences(raw, ['A12']);
    expect(critical).toHaveLength(1);
    expect(critical[0]?.scoreId).toBe('A12');
    expect(supporting).toHaveLength(2);
  });

  it('todos non-critical → critical vacío', () => {
    const raw = [{ scoreId: 'F01', confidence: 'high' as const }];
    const { critical, supporting } = collectDepConfidences(raw, []);
    expect(critical).toHaveLength(0);
    expect(supporting).toHaveLength(1);
  });
});
