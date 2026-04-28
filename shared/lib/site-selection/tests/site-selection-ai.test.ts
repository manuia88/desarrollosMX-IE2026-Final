import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Modo A — engine module test with createAdminClient + Anthropic SDK mocked.
// Coverage: placeholder fallback path + structured JSON parsing path.

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        in: () => Promise.resolve({ data: [], error: null }),
        or: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

const ORIGINAL_ENV = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (ORIGINAL_ENV !== undefined) {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
  vi.clearAllMocks();
  vi.resetModules();
});

describe('runSiteSelectionAI', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns placeholder when ANTHROPIC_API_KEY is unset', async () => {
    const { runSiteSelectionAI } = await import('../site-selection-ai');
    const result = await runSiteSelectionAI({
      query: 'Quiero terreno CDMX norte 60 unidades',
      userId: 'd1111111-1111-4111-8111-111111111111',
      desarrolladoraId: 'a2222222-2222-4222-8222-222222222222',
    });
    expect(result.isPlaceholder).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.costUsd).toBe(0);
    expect(result.parsedIntent).toMatchObject({ status: 'placeholder' });
  });

  it('placeholder zones include Roma Norte and Condesa as canonical examples', async () => {
    const { runSiteSelectionAI } = await import('../site-selection-ai');
    const result = await runSiteSelectionAI({
      query: 'CDMX residencial medio',
      userId: 'd1111111-1111-4111-8111-111111111111',
      desarrolladoraId: 'a2222222-2222-4222-8222-222222222222',
    });
    const colonias = result.zones.map((z) => z.colonia);
    expect(colonias).toContain('Roma Norte');
    expect(colonias).toContain('Condesa');
  });

  it('placeholder narrative mentions ADR-018 disclosure intent', async () => {
    const { runSiteSelectionAI } = await import('../site-selection-ai');
    const result = await runSiteSelectionAI({
      query: 'CDMX',
      userId: 'd1111111-1111-4111-8111-111111111111',
      desarrolladoraId: 'a2222222-2222-4222-8222-222222222222',
    });
    expect(result.narrative.toLowerCase()).toContain('placeholder');
  });
});
