// FASE 14.F.4 Sprint 3 — simpleLineDiff pure function unit tests.
// Covers: identical, only additions, only deletions, mixed token-level diff.

import { describe, expect, it } from 'vitest';
import { simpleLineDiff } from '@/features/dmx-studio/lib/version-diff';

function joinKind(segments: ReadonlyArray<{ kind: string; value: string }>, kind: string): string {
  return segments
    .filter((s) => s.kind === kind)
    .map((s) => s.value)
    .join('');
}

describe('simpleLineDiff — identical strings', () => {
  it('returns all unchanged segments and zero added/removed when strings match', () => {
    const a = 'Penthouse en Polanco con vista al parque';
    const result = simpleLineDiff(a, a);
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBeGreaterThan(0);
    expect(result.left.every((s) => s.kind === 'unchanged')).toBe(true);
    expect(result.right.every((s) => s.kind === 'unchanged')).toBe(true);
  });

  it('handles empty strings symmetrically', () => {
    const result = simpleLineDiff('', '');
    expect(result.left).toEqual([]);
    expect(result.right).toEqual([]);
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(0);
  });
});

describe('simpleLineDiff — only additions', () => {
  it('marks every right token as added when left is empty', () => {
    const result = simpleLineDiff('', 'Departamento amueblado');
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(0);
    expect(result.addedCount).toBeGreaterThan(0);
    expect(result.right.every((s) => s.kind === 'added')).toBe(true);
    expect(joinKind(result.right, 'added')).toBe('Departamento amueblado');
  });

  it('detects appended words preserving prefix as unchanged', () => {
    const result = simpleLineDiff('Casa con jardín', 'Casa con jardín y alberca');
    expect(result.addedCount).toBeGreaterThan(0);
    expect(result.removedCount).toBe(0);
    // The trailing tokens "y alberca" must be tagged added (with whitespace tokens between)
    const addedJoined = joinKind(result.right, 'added');
    expect(addedJoined).toContain('y');
    expect(addedJoined).toContain('alberca');
  });
});

describe('simpleLineDiff — only deletions', () => {
  it('marks every left token as removed when right is empty', () => {
    const result = simpleLineDiff('Penthouse exclusivo', '');
    expect(result.addedCount).toBe(0);
    expect(result.unchangedCount).toBe(0);
    expect(result.removedCount).toBeGreaterThan(0);
    expect(result.left.every((s) => s.kind === 'removed')).toBe(true);
    expect(joinKind(result.left, 'removed')).toBe('Penthouse exclusivo');
  });

  it('detects removed trailing words preserving prefix as unchanged', () => {
    const result = simpleLineDiff('Loft moderno céntrico', 'Loft moderno');
    expect(result.removedCount).toBeGreaterThan(0);
    expect(result.addedCount).toBe(0);
    const removedJoined = joinKind(result.left, 'removed');
    expect(removedJoined).toContain('céntrico');
  });
});

describe('simpleLineDiff — mixed', () => {
  it('detects both additions and removals on a substituted middle word', () => {
    const result = simpleLineDiff('Casa amplia luminosa', 'Casa elegante luminosa');
    expect(result.addedCount).toBeGreaterThan(0);
    expect(result.removedCount).toBeGreaterThan(0);
    expect(result.unchangedCount).toBeGreaterThan(0);
    expect(joinKind(result.left, 'removed')).toContain('amplia');
    expect(joinKind(result.right, 'added')).toContain('elegante');
    // Casa and luminosa survive on both sides
    expect(joinKind(result.left, 'unchanged')).toContain('Casa');
    expect(joinKind(result.right, 'unchanged')).toContain('luminosa');
  });

  it('preserves token order in left and right outputs (positional fidelity)', () => {
    const result = simpleLineDiff('alpha beta gamma', 'alpha gamma delta');
    // Reconstruct full left and right sequences
    const leftValues = result.left.map((s) => s.value).join('');
    const rightValues = result.right.map((s) => s.value).join('');
    expect(leftValues).toBe('alpha beta gamma');
    expect(rightValues).toBe('alpha gamma delta');
  });
});
