import { describe, expect, it } from 'vitest';
import { computeQualityScore, computeQualityScoreFromRecords } from '../lib/quality-score';
import type { ValidationRecord, ValidationSeverity } from '../schemas/validation';

function v(severity: ValidationSeverity, resolved = false): { severity: ValidationSeverity; resolved_at: string | null } {
  return { severity, resolved_at: resolved ? '2025-01-01T00:00:00Z' : null };
}

describe('computeQualityScore', () => {
  it('returns green/100 when no validations', () => {
    expect(computeQualityScore([])).toEqual({ score: 'green', numeric: 100 });
  });

  it('returns green/100 when only resolved findings', () => {
    expect(
      computeQualityScore([v('critical', true), v('error', true), v('warning', true)]),
    ).toEqual({ score: 'green', numeric: 100 });
  });

  it('returns red/0 when at least 1 unresolved critical', () => {
    expect(computeQualityScore([v('critical')])).toEqual({ score: 'red', numeric: 0 });
    expect(computeQualityScore([v('critical'), v('warning'), v('error')])).toEqual({
      score: 'red',
      numeric: 0,
    });
  });

  it('returns amber when only warnings (90 - 2/warning, floor 70)', () => {
    expect(computeQualityScore([v('warning')])).toEqual({ score: 'amber', numeric: 88 });
    expect(computeQualityScore([v('warning'), v('warning')])).toEqual({
      score: 'amber',
      numeric: 86,
    });
    // many warnings → floor 70
    const many = Array.from({ length: 50 }, () => v('warning'));
    expect(computeQualityScore(many)).toEqual({ score: 'amber', numeric: 70 });
  });

  it('returns amber when errors (60 - 5/error, floor 40) ignoring warnings', () => {
    expect(computeQualityScore([v('error')])).toEqual({ score: 'amber', numeric: 55 });
    expect(computeQualityScore([v('error'), v('warning'), v('warning')])).toEqual({
      score: 'amber',
      numeric: 55,
    });
    const many = Array.from({ length: 10 }, () => v('error'));
    expect(computeQualityScore(many)).toEqual({ score: 'amber', numeric: 40 });
  });

  it('info-only severities yield green', () => {
    expect(computeQualityScore([{ severity: 'info', resolved_at: null }])).toEqual({
      score: 'green',
      numeric: 100,
    });
  });

  it('mixed scenario: 1 critical wins regardless of others', () => {
    const all: ValidationSeverity[] = ['info', 'warning', 'error', 'critical'];
    const result = computeQualityScore(all.map((s) => v(s)));
    expect(result.score).toBe('red');
    expect(result.numeric).toBe(0);
  });
});

describe('computeQualityScoreFromRecords', () => {
  it('accepts ValidationRecord shape and reuses logic', () => {
    const records: ValidationRecord[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        job_id: '00000000-0000-0000-0000-000000000010',
        rule_code: 'WARN_X',
        severity: 'warning',
        message: 'm',
        field_path: null,
        expected_value: null,
        actual_value: null,
        resolved_at: null,
        resolved_by: null,
        resolution_note: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];
    expect(computeQualityScoreFromRecords(records)).toEqual({ score: 'amber', numeric: 88 });
  });
});
