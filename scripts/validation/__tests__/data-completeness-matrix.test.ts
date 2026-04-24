import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMatrix,
  classifyCompleteness,
  EXPECTED_COUNTS,
  parseArgs,
  type RowStatus,
  renderMarkdown,
} from '../data-completeness-matrix.ts';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

// ========================================================================
// Helpers
// ========================================================================

function makeInputRow(overrides: {
  session?: string;
  table?: string;
  description?: string;
  expected: number;
  actual: number;
  error?: string | null;
}) {
  return {
    session: overrides.session ?? '07.5.A',
    table: overrides.table ?? 'macro_series',
    description: overrides.description ?? 'test',
    expected: overrides.expected,
    actual: overrides.actual,
    error: overrides.error ?? null,
  };
}

const TS = '2026-04-24T00:00:00.000Z';

// ========================================================================
// Tests — classifyCompleteness
// ========================================================================

describe('classifyCompleteness', () => {
  it('expected=100 actual=100 → complete', () => {
    expect(classifyCompleteness({ expected: 100, actual: 100 })).toBe<RowStatus>('complete');
  });

  it('expected=100 actual=95 → complete (dentro ±10%)', () => {
    expect(classifyCompleteness({ expected: 100, actual: 95 })).toBe<RowStatus>('complete');
  });

  it('expected=100 actual=85 → warning (default config: warningPct=90=lowerTol, partial es zero-width)', () => {
    // Con la config default, warningPct (90) === lowerTol (100-10=90), por lo
    // que la banda "partial" tiene ancho cero. 85 cae en [stopPct=70, warningPct=90).
    expect(classifyCompleteness({ expected: 100, actual: 85 })).toBe<RowStatus>('warning');
  });

  it('partial solo se activa si warningPct < lowerTol (config custom)', () => {
    // Con warningPct=80, lowerTol=90 (tolerance=10): 85 cae en [80, 90) → partial.
    expect(
      classifyCompleteness(
        { expected: 100, actual: 85 },
        { warningPct: 80, stopPct: 70, tolerancePct: 10 },
      ),
    ).toBe<RowStatus>('partial');
  });

  it('expected=100 actual=75 → warning (70-90)', () => {
    expect(classifyCompleteness({ expected: 100, actual: 75 })).toBe<RowStatus>('warning');
  });

  it('expected=100 actual=50 → critical (<70)', () => {
    expect(classifyCompleteness({ expected: 100, actual: 50 })).toBe<RowStatus>('critical');
  });

  it('expected=100 actual=120 → over_populated (>110)', () => {
    expect(classifyCompleteness({ expected: 100, actual: 120 })).toBe<RowStatus>('over_populated');
  });

  it('expected=100 actual=0 → critical', () => {
    expect(classifyCompleteness({ expected: 100, actual: 0 })).toBe<RowStatus>('critical');
  });

  it('actual=-1 + error → error', () => {
    expect(
      classifyCompleteness({ expected: 100, actual: -1, error: 'network fail' }),
    ).toBe<RowStatus>('error');
  });

  it('boundary exactly at upper tol (110%) → complete', () => {
    expect(classifyCompleteness({ expected: 100, actual: 110 })).toBe<RowStatus>('complete');
  });

  it('boundary exactly at lower tol (90%) → complete', () => {
    expect(classifyCompleteness({ expected: 100, actual: 90 })).toBe<RowStatus>('complete');
  });

  it('expected=0 → error (división inválida)', () => {
    expect(classifyCompleteness({ expected: 0, actual: 0 })).toBe<RowStatus>('error');
  });
});

// ========================================================================
// Tests — buildMatrix
// ========================================================================

describe('buildMatrix', () => {
  it('3 complete rows → summary.complete === 3', () => {
    const rows = [
      makeInputRow({ session: '07.5.A', table: 't1', expected: 100, actual: 100 }),
      makeInputRow({ session: '07.5.A', table: 't2', expected: 200, actual: 195 }),
      makeInputRow({ session: '07.5.B', table: 't3', expected: 50, actual: 50 }),
    ];
    const m = buildMatrix(rows, TS);
    expect(m.summary.complete).toBe(3);
    expect(m.summary.totalRows).toBe(3);
    expect(m.summary.partial).toBe(0);
    expect(m.summary.warning).toBe(0);
    expect(m.summary.critical).toBe(0);
    expect(m.summary.error).toBe(0);
    expect(m.summary.overPopulated).toBe(0);
    expect(m.timestamp).toBe(TS);
  });

  it('mix 1 complete + 1 warning + 1 critical → counters exactos', () => {
    const rows = [
      makeInputRow({ session: 'X', table: 'a', expected: 100, actual: 100 }),
      makeInputRow({ session: 'X', table: 'b', expected: 100, actual: 75 }),
      makeInputRow({ session: 'X', table: 'c', expected: 100, actual: 30 }),
    ];
    const m = buildMatrix(rows, TS);
    expect(m.summary.complete).toBe(1);
    expect(m.summary.warning).toBe(1);
    expect(m.summary.critical).toBe(1);
    expect(m.summary.totalRows).toBe(3);
  });

  it('summary.sessions populated por row.session', () => {
    const rows = [
      makeInputRow({ session: '07.5.A', table: 't1', expected: 100, actual: 100 }),
      makeInputRow({ session: '07.5.A', table: 't2', expected: 100, actual: 50 }),
      makeInputRow({ session: '07.5.B', table: 't3', expected: 100, actual: 100 }),
      makeInputRow({ session: '07.5.C', table: 't4', expected: 100, actual: 100 }),
      makeInputRow({ session: '07.5.C', table: 't5', expected: 100, actual: 100 }),
    ];
    const m = buildMatrix(rows, TS);
    expect(m.summary.sessions['07.5.A']).toEqual({ complete: 1, total: 2 });
    expect(m.summary.sessions['07.5.B']).toEqual({ complete: 1, total: 1 });
    expect(m.summary.sessions['07.5.C']).toEqual({ complete: 2, total: 2 });
  });

  it('pct redondeado a 2 decimales', () => {
    const rows = [makeInputRow({ expected: 3, actual: 2 })]; // 66.6666...
    const m = buildMatrix(rows, TS);
    expect(m.rows[0]?.pct).toBe(66.67);
  });

  it('error row → actual negativo, pct 0, status error', () => {
    const rows = [makeInputRow({ expected: 100, actual: -1, error: 'network down' })];
    const m = buildMatrix(rows, TS);
    expect(m.rows[0]?.status).toBe<RowStatus>('error');
    expect(m.rows[0]?.pct).toBe(0);
    expect(m.summary.error).toBe(1);
  });

  it('over_populated row → summary.overPopulated incremental', () => {
    const rows = [
      makeInputRow({ expected: 100, actual: 500 }),
      makeInputRow({ expected: 100, actual: 100 }),
    ];
    const m = buildMatrix(rows, TS);
    expect(m.summary.overPopulated).toBe(1);
    expect(m.summary.complete).toBe(1);
  });
});

// ========================================================================
// Tests — renderMarkdown
// ========================================================================

describe('renderMarkdown', () => {
  it('incluye header + row match regex + ## Summary section', () => {
    const rows = [
      makeInputRow({
        session: '07.5.A',
        table: 'macro_series',
        expected: 880,
        actual: 880,
      }),
    ];
    const m = buildMatrix(rows, TS);
    const md = renderMarkdown(m);
    expect(md).toContain(`# FASE 07.5 Completeness Matrix — ${TS}`);
    expect(md).toMatch(/\| 07\.5\.A \| macro_series \|/);
    expect(md).toContain('## Summary');
    expect(md).toContain('## Por sesión');
    expect(md).toContain('- complete: 1/1');
  });

  it('incluye row per session en "Por sesión"', () => {
    const rows = [
      makeInputRow({ session: '07.5.A', table: 't1', expected: 100, actual: 100 }),
      makeInputRow({ session: '07.5.B', table: 't2', expected: 100, actual: 50 }),
    ];
    const m = buildMatrix(rows, TS);
    const md = renderMarkdown(m);
    expect(md).toContain('- 07.5.A: 1/1 complete');
    expect(md).toContain('- 07.5.B: 0/1 complete');
  });

  it('formato pct con 2 decimales en tabla', () => {
    const rows = [makeInputRow({ expected: 3, actual: 2 })];
    const m = buildMatrix(rows, TS);
    const md = renderMarkdown(m);
    expect(md).toMatch(/\| 66\.67 \|/);
  });
});

// ========================================================================
// Tests — EXPECTED_COUNTS constant audit
// ========================================================================

describe('EXPECTED_COUNTS', () => {
  it('length === 18', () => {
    expect(EXPECTED_COUNTS).toHaveLength(18);
  });

  it('todas sesiones 07.5.A..07.5.E presentes (5 únicas)', () => {
    const sessions = Array.from(new Set(EXPECTED_COUNTS.map((r) => r.session))).sort();
    expect(sessions).toEqual(['07.5.A', '07.5.B', '07.5.C', '07.5.D', '07.5.E']);
  });

  it('zero expected === 0 (sanity)', () => {
    for (const row of EXPECTED_COUNTS) {
      expect(row.expected).toBeGreaterThan(0);
    }
  });

  it('todas rows tienen table + description no vacías', () => {
    for (const row of EXPECTED_COUNTS) {
      expect(row.table.length).toBeGreaterThan(0);
      expect(row.description.length).toBeGreaterThan(0);
    }
  });
});

// ========================================================================
// Tests — CLI parser
// ========================================================================

describe('parseArgs', () => {
  it('default → json output, no dry-run', () => {
    const args = parseArgs(['node', 'script.ts']);
    expect(args.output).toBe('json');
    expect(args.dryRun).toBe(false);
  });

  it('--dry-run → dryRun true', () => {
    const args = parseArgs(['node', 'script.ts', '--dry-run']);
    expect(args.dryRun).toBe(true);
  });

  it('--output=md → md', () => {
    const args = parseArgs(['node', 'script.ts', '--output=md']);
    expect(args.output).toBe('md');
  });

  it('--output=json → json explícito', () => {
    const args = parseArgs(['node', 'script.ts', '--output=json']);
    expect(args.output).toBe('json');
  });

  it('--output=xml → throws', () => {
    expect(() => parseArgs(['node', 'script.ts', '--output=xml'])).toThrow(/--output inválido/);
  });
});
