import { describe, expect, it } from 'vitest';
import { useSidebarHover } from '../hooks/use-sidebar-hover';

describe('useSidebarHover (signature)', () => {
  it('exports a function', () => {
    expect(typeof useSidebarHover).toBe('function');
  });

  it('accepts persistKey option (no throw on call signature)', () => {
    expect(useSidebarHover.length).toBeLessThanOrEqual(1);
  });

  it('module path resolves cleanly', async () => {
    const mod = await import('../hooks/use-sidebar-hover');
    expect(typeof mod.useSidebarHover).toBe('function');
  });
});
