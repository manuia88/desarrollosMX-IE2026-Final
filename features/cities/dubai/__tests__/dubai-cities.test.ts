// FASE 14.1 — Dubai city expansion tests (ADR-059 §Step 7).
// Modo A: createCaller mocks (default, CI-fast). NO real Supabase/JWT.
// Cubre: zones canon, multi-currency peg, IE scores synthetic, Reelly STUB ADR-018 4 señales.

import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DUBAI_ZONES_CANON } from '../data-loader';
import { DUBAI_FEATURE_FLAGS } from '../feature-flags';
import { DUBAI_I18N_EN_US, DUBAI_I18N_ES_MX } from '../i18n-keys';
import { calculateDubaiIEScores } from '../ie-scores-calculator';
import { AED_USD_PEG, getDubaiPricing } from '../multi-currency';

// Mock fx cascade — convert returns null para forzar fallback hardcoded.
vi.mock('@/shared/lib/currency/fx', () => ({
  convert: vi.fn(async () => null),
  FX_BASE: 'USD',
  FX_CACHE_TTL_MS: 600_000,
  getLatestRate: vi.fn(async () => null),
  fetchAndStoreRates: vi.fn(),
}));

// Mock Reelly client — vaciamos REELLY_API_KEY para señal 2 ADR-018.
beforeEach(() => {
  vi.resetModules();
  delete process.env.REELLY_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FASE 14.1 — Dubai zones canon', () => {
  it('Test 1: DUBAI_ZONES_CANON has exactly 8 zones', () => {
    expect(DUBAI_ZONES_CANON).toHaveLength(8);
  });

  it('Test 2: All zones country_code=AE parent_scope_id=dubai', () => {
    for (const zone of DUBAI_ZONES_CANON) {
      expect(zone.country_code).toBe('AE');
      expect(zone.parent_scope_id).toBe('dubai');
      expect(zone.scope_type).toBe('colonia');
    }
  });

  it('Test 3: zones lat in [25.0, 25.3], lng in [55.0, 55.4]', () => {
    for (const zone of DUBAI_ZONES_CANON) {
      expect(zone.lat).toBeGreaterThanOrEqual(25.0);
      expect(zone.lat).toBeLessThanOrEqual(25.3);
      expect(zone.lng).toBeGreaterThanOrEqual(55.0);
      expect(zone.lng).toBeLessThanOrEqual(55.4);
    }
  });
});

describe('FASE 14.1 — Reelly STUB ADR-018 (señales 2 + 4)', () => {
  it('Test 4: testConnection returns ok:false reason="REELLY_API_KEY missing" when env var absent', async () => {
    delete process.env.REELLY_API_KEY;
    const reelly = await import('../lib/reelly');
    reelly._resetReellyClientForTests();
    const result = await reelly.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('REELLY_API_KEY missing');
    expect(result.account_balance).toBeNull();
    expect(result.projects_available).toBeNull();
  });

  it('Test 5: listProjectsDubai throws TRPCError NOT_IMPLEMENTED when stub', async () => {
    delete process.env.REELLY_API_KEY;
    const reelly = await import('../lib/reelly');
    reelly._resetReellyClientForTests();
    await expect(reelly.listProjectsDubai({})).rejects.toBeInstanceOf(TRPCError);
    try {
      await reelly.listProjectsDubai({});
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_IMPLEMENTED');
    }
  });

  it('Test 6: getProjectDetails throws TRPCError NOT_IMPLEMENTED when stub', async () => {
    delete process.env.REELLY_API_KEY;
    const reelly = await import('../lib/reelly');
    reelly._resetReellyClientForTests();
    await expect(reelly.getProjectDetails('any-id')).rejects.toBeInstanceOf(TRPCError);
    try {
      await reelly.getProjectDetails('any-id');
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_IMPLEMENTED');
    }
  });

  it('Test 7: syncProjectsToDmx throws TRPCError NOT_IMPLEMENTED when stub', async () => {
    delete process.env.REELLY_API_KEY;
    const reelly = await import('../lib/reelly');
    reelly._resetReellyClientForTests();
    await expect(reelly.syncProjectsToDmx({})).rejects.toBeInstanceOf(TRPCError);
    try {
      await reelly.syncProjectsToDmx({});
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_IMPLEMENTED');
    }
  });
});

describe('FASE 14.1 — Multi-currency AED/USD peg + MXN cascade', () => {
  it('Test 8: getDubaiPricing returns {usd, aed, mxn} with aed = usd * 3.6725', async () => {
    const pricing = await getDubaiPricing(1000);
    expect(pricing.usd).toBe(1000);
    expect(pricing.aed).toBeCloseTo(1000 * AED_USD_PEG, 5);
    expect(pricing.mxn).toBeGreaterThan(0);
  });

  it('Test 9: AED_USD_PEG === 3.6725 (UAE Central Bank fixed peg)', () => {
    expect(AED_USD_PEG).toBe(3.6725);
  });
});

describe('FASE 14.1 — IE scores synthetic baseline (ADR-018 STUB H1)', () => {
  it('Test 10: calculateDubaiIEScores returns 4 score types per zone with provenance.is_synthetic=true', () => {
    const scores = calculateDubaiIEScores();
    // 8 zones × 4 score types = 32 rows
    expect(scores).toHaveLength(32);
    const types = new Set(scores.map((s) => s.scoreType));
    expect(types).toEqual(new Set(['pulse', 'futures_alpha', 'ghost', 'zone_alpha']));
    for (const score of scores) {
      expect(score.provenance.is_synthetic).toBe(true);
      expect(score.provenance.adr).toBe('ADR-059');
      expect(score.provenance.source).toBe('F14.1.0_synthetic_baseline_dubai_pre_reelly');
    }
  });
});

describe('FASE 14.1 — i18n keys EN_US + ES_MX', () => {
  it('Test 11: i18n EN_US contains comingSoonBadge + priceUsdLabel + priceAedLabel', () => {
    expect(DUBAI_I18N_EN_US['Cities.dubai.comingSoonBadge']).toContain('Coming soon');
    expect(DUBAI_I18N_EN_US['Cities.dubai.priceUsdLabel']).toBe('USD');
    expect(DUBAI_I18N_EN_US['Cities.dubai.priceAedLabel']).toBe('AED');
    expect(DUBAI_I18N_ES_MX['Cities.dubai.priceUsdLabel']).toBe('USD');
    expect(DUBAI_I18N_ES_MX['Cities.dubai.priceAedLabel']).toBe('AED');
    expect(DUBAI_I18N_ES_MX['Cities.dubai.name']).toBe('Dubái');
  });
});

describe('FASE 14.1 — Feature flags defaults (ADR-018 señal 1)', () => {
  it('Test 12: DUBAI_FEATURE_FLAGS.DUBAI_REELLY_API_ENABLED === false default H1', () => {
    expect(DUBAI_FEATURE_FLAGS.DUBAI_REELLY_API_ENABLED).toBe(false);
    expect(DUBAI_FEATURE_FLAGS.DUBAI_FULL_LOCALE_AR_AE).toBe(false);
    expect(DUBAI_FEATURE_FLAGS.DUBAI_DAILY_SYNC_CRON).toBe(false);
  });
});
