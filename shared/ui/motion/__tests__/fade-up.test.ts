import { describe, expect, it } from 'vitest';

describe('FadeUp — module export smoke', () => {
  it('exports FadeUp as function', async () => {
    const mod = await import('../fade-up');
    expect(typeof mod.FadeUp).toBe('function');
    expect(mod.FadeUp.name).toBe('FadeUp');
  });
});

describe('StaggerContainer — module export smoke', () => {
  it('exports StaggerContainer as function', async () => {
    const mod = await import('../stagger-container');
    expect(typeof mod.StaggerContainer).toBe('function');
    expect(mod.StaggerContainer.name).toBe('StaggerContainer');
  });
});

describe('Marquee — module export smoke', () => {
  it('exports Marquee as function', async () => {
    const mod = await import('../marquee');
    expect(typeof mod.Marquee).toBe('function');
    expect(mod.Marquee.name).toBe('Marquee');
  });
});

describe('motion hooks — module exports', () => {
  it('exports useInView as function', async () => {
    const mod = await import('../use-in-view');
    expect(typeof mod.useInView).toBe('function');
  });

  it('exports useTilt3D as function', async () => {
    const mod = await import('../use-3d-tilt');
    expect(typeof mod.useTilt3D).toBe('function');
  });
});

describe('motion barrel — index re-exports', () => {
  it('re-exports all primitives + hooks', async () => {
    const mod = await import('../index');
    expect(typeof mod.BlurText).toBe('function');
    expect(typeof mod.FadeUp).toBe('function');
    expect(typeof mod.StaggerContainer).toBe('function');
    expect(typeof mod.Marquee).toBe('function');
    expect(typeof mod.useInView).toBe('function');
    expect(typeof mod.useTilt3D).toBe('function');
    expect(typeof mod.splitWords).toBe('function');
  });
});
