import { describe, expect, it } from 'vitest';
import * as components from '../components';

describe('features/ie/components', () => {
  it('exporta ZoneIntelligenceCard', () => {
    expect(typeof components.ZoneIntelligenceCard).toBe('function');
  });
});
