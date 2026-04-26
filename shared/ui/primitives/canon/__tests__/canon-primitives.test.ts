import { describe, expect, it } from 'vitest';
import { directionFromDelta, tierFromScore } from '../index';

describe('canon barrel — module exports', () => {
  it('re-exports all canon primitives', async () => {
    const mod = await import('../index');
    expect(typeof mod.Card).toBe('object');
    expect(typeof mod.Button).toBe('object');
    expect(typeof mod.ScorePill).toBe('object');
    expect(typeof mod.MomentumPill).toBe('object');
    expect(typeof mod.GlassOverlay).toBe('object');
    expect(typeof mod.IconCircle).toBe('object');
    expect(typeof mod.cn).toBe('function');
    expect(typeof mod.tierFromScore).toBe('function');
    expect(typeof mod.directionFromDelta).toBe('function');
    expect(typeof mod.buttonVariants).toBe('function');
  });
});

describe('cn — class merger', () => {
  it('merges duplicate tailwind classes via twMerge', async () => {
    const { cn } = await import('../cn');
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles falsy inputs', async () => {
    const { cn } = await import('../cn');
    expect(cn('foo', null, undefined, false)).toBe('foo');
  });
});

describe('tierFromScore — score → tier mapping', () => {
  it('returns excellent for score >= 85', () => {
    expect(tierFromScore(100)).toBe('excellent');
    expect(tierFromScore(85)).toBe('excellent');
  });

  it('returns good for 65-84', () => {
    expect(tierFromScore(84)).toBe('good');
    expect(tierFromScore(65)).toBe('good');
  });

  it('returns warning for 40-64', () => {
    expect(tierFromScore(64)).toBe('warning');
    expect(tierFromScore(40)).toBe('warning');
  });

  it('returns critical for < 40', () => {
    expect(tierFromScore(39)).toBe('critical');
    expect(tierFromScore(0)).toBe('critical');
  });
});

describe('directionFromDelta — momentum direction', () => {
  it('returns positive for delta > 0.5', () => {
    expect(directionFromDelta(1)).toBe('positive');
    expect(directionFromDelta(5.2)).toBe('positive');
  });

  it('returns negative for delta < -0.5', () => {
    expect(directionFromDelta(-1)).toBe('negative');
    expect(directionFromDelta(-3.8)).toBe('negative');
  });

  it('returns neutral for |delta| <= 0.5', () => {
    expect(directionFromDelta(0)).toBe('neutral');
    expect(directionFromDelta(0.4)).toBe('neutral');
    expect(directionFromDelta(-0.5)).toBe('neutral');
  });
});

describe('buttonVariants — CVA configuration', () => {
  it('returns string with default variant + size', async () => {
    const { buttonVariants } = await import('../button');
    const cls = buttonVariants();
    expect(typeof cls).toBe('string');
    expect(cls).toContain('rounded-[var(--canon-radius-pill)]');
  });

  it('applies primary variant gradient classes', async () => {
    const { buttonVariants } = await import('../button');
    const cls = buttonVariants({ variant: 'primary' });
    expect(cls).toContain('linear-gradient');
  });

  it('applies size sm height', async () => {
    const { buttonVariants } = await import('../button');
    const cls = buttonVariants({ size: 'sm' });
    expect(cls).toContain('h-[34px]');
  });
});
