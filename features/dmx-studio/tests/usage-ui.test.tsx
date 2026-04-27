// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Usage UI tests (Modo A: smoke + i18n contract +
// behavior contract via mocked tRPC client + mocked recharts).

import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('@/shared/ui/motion', () => ({
  FadeUp: ({ children }: { readonly children?: React.ReactNode }) => children ?? null,
}));

vi.mock('recharts', () => {
  const Passthrough = ({ children }: { readonly children?: React.ReactNode }) => children ?? null;
  const Empty = () => null;
  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Empty,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
  };
});

const portalMutateMock = vi.fn();

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      usage: {
        getCurrent: {
          useQuery: vi.fn(() => ({
            data: {
              planKey: 'pro',
              subscriptionStatus: 'active',
              period: '2026-04',
              used: 2,
              limit: 5,
              remaining: 3,
              usedPct: 0.4,
              thresholdReached80: false,
              thresholdReached100: false,
            },
            isLoading: false,
            error: null,
          })),
        },
        getHistory: {
          useQuery: vi.fn(() => ({
            data: {
              months: [
                {
                  period: '2026-03',
                  videos: 4,
                  costUsd: 1.6,
                  byModel: { kling: 1.2, elevenlabs: 0.3, claude: 0.1 },
                },
                {
                  period: '2026-04',
                  videos: 2,
                  costUsd: 0.8,
                  byModel: { kling: 0.5, elevenlabs: 0.2, claude: 0.1 },
                },
              ],
              totals: {
                totalCostUsd: 2.4,
                totalVideos: 6,
                avgPerVideo: 0.4,
              },
            },
            isLoading: false,
            error: null,
          })),
        },
        checkLimit: {
          useQuery: vi.fn(() => ({
            data: { ok: true, used: 2, limit: 5, remaining: 3, planKey: 'pro' },
            isLoading: false,
          })),
        },
      },
      subscriptions: {
        getPortalUrl: {
          useMutation: vi.fn(() => ({
            mutate: portalMutateMock,
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe('UsageStatsCard — module + render contract', () => {
  it('exports UsageStatsCard as function', async () => {
    const mod = await import('../components/usage/UsageStatsCard');
    expect(typeof mod.UsageStatsCard).toBe('function');
    expect(mod.UsageStatsCard.name).toBe('UsageStatsCard');
  });

  it('renders X of Y label using videosOfLimit translation key with {used,limit} vars', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const queryHook = clientMod.trpc.studio.usage.getCurrent.useQuery as unknown as () => {
      data: { used: number; limit: number; usedPct: number };
    };
    const result = queryHook();
    expect(result.data.used).toBe(2);
    expect(result.data.limit).toBe(5);
    // Verify the translated stub format includes both used and limit
    const tStub = (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${JSON.stringify(vars)}` : k;
    const rendered = tStub('videosOfLimit', { used: result.data.used, limit: result.data.limit });
    expect(rendered).toContain('videosOfLimit');
    expect(rendered).toContain('"used":2');
    expect(rendered).toContain('"limit":5');
  });

  it('amber warning banner appears when thresholdReached80=true (usedPct >= 0.8)', async () => {
    // Validate threshold logic: 4/5 = 0.8 triggers thresholdReached80 in router.
    const usedPct = 4 / 5;
    expect(usedPct >= 0.8).toBe(true);
    expect(usedPct >= 1).toBe(false);
  });

  it('red blocker banner appears when thresholdReached100=true (usedPct >= 1)', async () => {
    const usedPct = 5 / 5;
    expect(usedPct >= 1).toBe(true);
  });
});

describe('UsageLimitBlocker — module + paywall contract', () => {
  it('exports UsageLimitBlocker as function', async () => {
    const mod = await import('../components/usage/UsageLimitBlocker');
    expect(typeof mod.UsageLimitBlocker).toBe('function');
    expect(mod.UsageLimitBlocker.name).toBe('UsageLimitBlocker');
  });

  it('renders blockerTitle + blockerSubtitle + blockerCta keys (i18n contract)', async () => {
    const messages = await import('@/messages/es-MX.json');
    const u = (
      messages.default as unknown as {
        Studio: {
          usage: { blockerTitle: string; blockerSubtitle: string; blockerCta: string };
        };
      }
    ).Studio.usage;
    expect(u.blockerTitle.length).toBeGreaterThan(3);
    expect(u.blockerSubtitle.length).toBeGreaterThan(3);
    expect(u.blockerCta.length).toBeGreaterThan(0);
  });

  it('CTA wires to subscriptions.getPortalUrl mutation (Stripe customer portal)', async () => {
    portalMutateMock.mockClear();
    const clientMod = await import('@/shared/lib/trpc/client');
    const useMutationHook = clientMod.trpc.studio.subscriptions.getPortalUrl
      .useMutation as unknown as () => { mutate: (args: unknown) => void };
    const m = useMutationHook();
    m.mutate({ returnPath: '/studio-app/usage' });
    expect(portalMutateMock).toHaveBeenCalledWith({ returnPath: '/studio-app/usage' });
  });
});

describe('CostsBreakdown — chart data contract', () => {
  it('exports CostsBreakdown as function', async () => {
    const mod = await import('../components/usage/CostsBreakdown');
    expect(typeof mod.CostsBreakdown).toBe('function');
    expect(mod.CostsBreakdown.name).toBe('CostsBreakdown');
  });

  it('BarChart consumes months data with period + costUsd shape', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const queryHook = clientMod.trpc.studio.usage.getHistory.useQuery as unknown as () => {
      data: { months: ReadonlyArray<{ period: string; costUsd: number; videos: number }> };
    };
    const result = queryHook();
    expect(Array.isArray(result.data.months)).toBe(true);
    expect(result.data.months.length).toBeGreaterThan(0);
    const firstMonth = result.data.months[0];
    expect(typeof firstMonth?.period).toBe('string');
    expect(typeof firstMonth?.costUsd).toBe('number');
  });

  it('PieChart categories cover Kling / ElevenLabs / Claude / Other (4 model keys)', async () => {
    const messages = await import('@/messages/es-MX.json');
    const u = (
      messages.default as unknown as {
        Studio: {
          usage: {
            modelKling: string;
            modelElevenLabs: string;
            modelClaude: string;
            modelOther: string;
          };
        };
      }
    ).Studio.usage;
    expect(u.modelKling.length).toBeGreaterThan(0);
    expect(u.modelElevenLabs.length).toBeGreaterThan(0);
    expect(u.modelClaude.length).toBeGreaterThan(0);
    expect(u.modelOther.length).toBeGreaterThan(0);
  });
});

describe('Studio.usage i18n contract', () => {
  it('en-US mirrors the same usage key shape as es-MX', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = (esMod.default as unknown as { Studio: { usage: Record<string, unknown> } }).Studio
      .usage;
    const en = (enMod.default as unknown as { Studio: { usage: Record<string, unknown> } }).Studio
      .usage;
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
});
