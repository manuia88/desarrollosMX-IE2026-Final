import { describe, expect, it } from 'vitest';
import * as hooks from '../hooks';

describe('ie hooks public API', () => {
  it('exporta useZoneScores, useZoneScoresByLevel, useScoreHistory, useScoreDependencies', () => {
    expect(typeof hooks.useZoneScores).toBe('function');
    expect(typeof hooks.useZoneScoresByLevel).toBe('function');
    expect(typeof hooks.useScoreHistory).toBe('function');
    expect(typeof hooks.useScoreDependencies).toBe('function');
  });
});
