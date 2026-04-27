// F14.F.5 Sprint 4 — MoodIndicator badge color contract per mood.

import { describe, expect, it } from 'vitest';

describe('MoodIndicator — module export smoke', () => {
  it('exports MoodIndicator as function', async () => {
    const mod = await import('../../components/calendar/MoodIndicator');
    expect(typeof mod.MoodIndicator).toBe('function');
  });

  it('uses canon ADR-050 4 mood color tints (low=indigo, neutral=cream, high=green, celebratory=gradient amber+rose)', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const url = await import('node:url');
    const here = url.fileURLToPath(new URL('.', import.meta.url));
    const filePath = path.resolve(here, '../../components/calendar/MoodIndicator.tsx');
    const source = await fs.readFile(filePath, 'utf-8');
    // 4 mood keys
    expect(source).toMatch(/low:/);
    expect(source).toMatch(/neutral:/);
    expect(source).toMatch(/high:/);
    expect(source).toMatch(/celebratory:/);
    // Tokens canon (no hardcoded hex outside rgba alphas).
    expect(source).toMatch(/var\(--canon-indigo-2\)/);
    expect(source).toMatch(/var\(--canon-cream\)/);
    expect(source).toMatch(/var\(--canon-green\)/);
    // Celebratory uses gradient amber+rose linear-gradient.
    expect(source).toMatch(/linear-gradient/);
    expect(source).toMatch(/245, 158, 11/);
    expect(source).toMatch(/236, 72, 153/);
  });
});
