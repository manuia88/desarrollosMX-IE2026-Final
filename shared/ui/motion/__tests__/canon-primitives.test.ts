import { describe, expect, it } from 'vitest';

describe('AmbientBackground — module export smoke', () => {
  it('exports AmbientBackground as function', async () => {
    const mod = await import('../ambient-background');
    expect(typeof mod.AmbientBackground).toBe('function');
    expect(mod.AmbientBackground.name).toBe('AmbientBackground');
  });
});

describe('HeroCanvas — module export smoke', () => {
  it('exports HeroCanvas as function', async () => {
    const mod = await import('../hero-canvas');
    expect(typeof mod.HeroCanvas).toBe('function');
    expect(mod.HeroCanvas.name).toBe('HeroCanvas');
  });
});

describe('AnimatedBar — module export smoke', () => {
  it('exports AnimatedBar as function', async () => {
    const mod = await import('../animated-bar');
    expect(typeof mod.AnimatedBar).toBe('function');
    expect(mod.AnimatedBar.name).toBe('AnimatedBar');
  });
});

describe('CountUp — module export smoke', () => {
  it('exports CountUp as function', async () => {
    const mod = await import('../count-up');
    expect(typeof mod.CountUp).toBe('function');
    expect(mod.CountUp.name).toBe('CountUp');
  });
});

describe('motion barrel — canon primitives re-export', () => {
  it('re-exports AmbientBackground, HeroCanvas, AnimatedBar, CountUp', async () => {
    const mod = await import('../index');
    expect(typeof mod.AmbientBackground).toBe('function');
    expect(typeof mod.HeroCanvas).toBe('function');
    expect(typeof mod.AnimatedBar).toBe('function');
    expect(typeof mod.CountUp).toBe('function');
  });
});
