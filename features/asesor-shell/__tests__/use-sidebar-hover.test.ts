import { describe, expect, it } from 'vitest';
import { useSidebarHover } from '../hooks/use-sidebar-hover';

describe('useSidebarHover (signature)', () => {
  it('exports a function', () => {
    expect(typeof useSidebarHover).toBe('function');
  });
});
