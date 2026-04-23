import { describe, expect, it } from 'vitest';
import type { PitchCardData } from '../components/asesor/PitchBuilder';
import { PitchBuilder } from '../components/asesor/PitchBuilder';
import { ProfileTabs } from '../components/asesor/ProfileTabs';
import { getNarvarteMock } from '../lib/mock-data-provider';
import { CLIENT_PROFILES_MOCK } from '../mock/client-profiles-mock';

// Smoke / shape tests. Sin jsdom — validamos exports + forma del contrato.
describe('features/preview-ux components (asesor)', () => {
  it('exporta ProfileTabs como componente función', () => {
    expect(typeof ProfileTabs).toBe('function');
    expect(ProfileTabs.name).toBe('ProfileTabs');
  });

  it('exporta PitchBuilder como componente función', () => {
    expect(typeof PitchBuilder).toBe('function');
    expect(PitchBuilder.name).toBe('PitchBuilder');
  });

  it('CLIENT_PROFILES_MOCK contiene 3 perfiles con la forma esperada', () => {
    expect(CLIENT_PROFILES_MOCK.length).toBe(3);
    for (const p of CLIENT_PROFILES_MOCK) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.nameKey).toBe('string');
      expect(typeof p.family).toBe('string');
      expect(typeof p.budgetMxn).toBe('number');
      expect(['schools', 'commute', 'lifestyle']).toContain(p.priority);
      expect(p.proposedZones.length).toBeGreaterThanOrEqual(3);
      for (const z of p.proposedZones) {
        expect(typeof z.scopeId).toBe('string');
        expect(typeof z.fitPct).toBe('number');
        expect(z.fitPct).toBeGreaterThanOrEqual(0);
        expect(z.fitPct).toBeLessThanOrEqual(100);
        expect(typeof z.rationaleKey).toBe('string');
      }
    }
  });

  it('PitchCardData se construye desde CLIENT_PROFILES_MOCK + NARVARTE_MOCK sin perder datos', () => {
    const narvarte = getNarvarteMock();
    const laura = CLIENT_PROFILES_MOCK[0];
    expect(laura).toBeDefined();
    if (!laura) return;
    const topScores = [...narvarte.scores].sort((a, b) => b.value - a.value).slice(0, 3);
    const famScore = narvarte.scores.find((s) => s.code === 'FAM');
    const ipvScore = narvarte.scores.find((s) => s.code === 'IPV');
    const cards: readonly PitchCardData[] = laura.proposedZones.map((zone) => ({
      scopeId: zone.scopeId,
      topScores,
      appreciation12m: ipvScore?.trend_pct_12m ?? 0,
      famPercentile: famScore?.percentile ?? 0,
    }));
    expect(cards.length).toBe(laura.proposedZones.length);
    for (const c of cards) {
      expect(typeof c.scopeId).toBe('string');
      expect(c.topScores.length).toBe(3);
      expect(typeof c.appreciation12m).toBe('number');
      expect(typeof c.famPercentile).toBe('number');
    }
  });

  it('los perfiles referencian zonas por slug (nunca UUID) — compatibles con resolveZoneLabelSync', () => {
    for (const p of CLIENT_PROFILES_MOCK) {
      for (const z of p.proposedZones) {
        // Slugs esperados: minúsculas + guiones, sin patrón UUID.
        expect(z.scopeId).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    }
  });
});
