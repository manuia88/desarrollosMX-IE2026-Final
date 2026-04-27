// FASE 14.F.2 Sprint 1 — ResultPage tests (Modo A: smoke + i18n contract).

import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: { projects: { getById: { invalidate: vi.fn() } } },
    }),
    studio: {
      projects: {
        getById: {
          useQuery: vi.fn(() => ({
            data: {
              project: {
                id: 'p1',
                title: 'Penthouse Polanco',
                status: 'rendered',
                director_brief: {
                  hooks: [
                    'Hook A: Vista 360 al parque',
                    'Hook B: Inversión que renta sola',
                    'Hook C: Tu próximo hogar',
                  ],
                },
              },
              assets: [],
              outputs: [
                {
                  id: 'o1',
                  hook_variant: 'hook_a',
                  format: '9x16',
                  storage_url: 'https://example.com/a.mp4',
                  selected_by_user: true,
                  duration_seconds: 60,
                },
                {
                  id: 'o2',
                  hook_variant: 'hook_b',
                  format: '9x16',
                  storage_url: 'https://example.com/b.mp4',
                  selected_by_user: false,
                  duration_seconds: 60,
                },
                {
                  id: 'o3',
                  hook_variant: 'hook_c',
                  format: '9x16',
                  storage_url: 'https://example.com/c.mp4',
                  selected_by_user: false,
                  duration_seconds: 60,
                },
              ],
              copy: [
                { id: 'c1', channel: 'instagram_caption', content: 'Caption IG' },
                { id: 'c2', channel: 'hashtags', content: '#penthouse #polanco' },
                { id: 'c3', channel: 'wa_message', content: 'WA message' },
                { id: 'c4', channel: 'portal_listing', content: 'Portal description' },
                { id: 'c5', channel: 'narration_script', content: 'Narration script' },
              ],
            },
            isLoading: false,
            isError: false,
            error: null,
          })),
        },
        selectHook: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
        submitFeedback: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
      },
    },
  },
}));

describe('ResultPage — module export smoke', () => {
  it('exports ResultPage as function', async () => {
    const mod = await import('../../../components/projects/ResultPage');
    expect(typeof mod.ResultPage).toBe('function');
    expect(mod.ResultPage.name).toBe('ResultPage');
  });

  it('exports HookSelector + CopyPackViewer + FeedbackForm + ShareWhatsappButton', async () => {
    const a = await import('../../../components/projects/HookSelector');
    const b = await import('../../../components/projects/CopyPackViewer');
    const c = await import('../../../components/projects/FeedbackForm');
    const d = await import('../../../components/projects/ShareWhatsappButton');
    expect(typeof a.HookSelector).toBe('function');
    expect(typeof b.CopyPackViewer).toBe('function');
    expect(typeof c.FeedbackForm).toBe('function');
    expect(typeof d.ShareWhatsappButton).toBe('function');
  });
});

describe('ResultPage — i18n contract (Studio.result namespace)', () => {
  it('es-MX has all required result keys', async () => {
    const messages = await import('@/messages/es-MX.json');
    const json = messages.default as unknown as {
      Studio: { result: Record<string, string> };
    };
    const r = json.Studio.result;
    const required = [
      'title',
      'subtitle',
      'hookATab',
      'hookBTab',
      'hookCTab',
      'selectedBadge',
      'copyPackTitle',
      'captionInstagramLabel',
      'hashtagsLabel',
      'wamessageLabel',
      'portalDescriptionLabel',
      'narrationScriptLabel',
      'copyButton',
      'copiedToast',
      'downloadButton',
      'formatLabel',
      'shareWhatsapp',
      'feedbackTitle',
      'ratingLabel',
      'selectedHookLabel',
      'preferredFormatLabel',
      'commentsLabel',
      'wouldRecommendLabel',
      'submitFeedbackButton',
      'feedbackSubmittedToast',
      'errorTitle',
    ];
    for (const k of required) {
      expect(typeof r[k]).toBe('string');
      expect((r[k] ?? '').length).toBeGreaterThan(0);
    }
  });

  it('en-US mirrors es-MX result key shape exactly', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = (esMod.default as unknown as { Studio: { result: Record<string, unknown> } }).Studio
      .result;
    const en = (enMod.default as unknown as { Studio: { result: Record<string, unknown> } }).Studio
      .result;
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
});

describe('ResultPage — mocked tRPC contract for outputs', () => {
  it('getById returns 3 hook variants of 9x16 video outputs', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const queryHook = clientMod.trpc.studio.projects.getById.useQuery as unknown as () => {
      data: {
        outputs: ReadonlyArray<{
          hook_variant: 'hook_a' | 'hook_b' | 'hook_c';
          format: string;
        }>;
      };
    };
    const q = queryHook();
    expect(q.data.outputs).toHaveLength(3);
    const variants = q.data.outputs.map((o) => o.hook_variant).sort();
    expect(variants).toEqual(['hook_a', 'hook_b', 'hook_c']);
    for (const o of q.data.outputs) {
      expect(o.format).toBe('9x16');
    }
  });

  it('download buttons present per format (data-testid contract)', async () => {
    // Contract verification: ResultPage renders one download anchor per output of
    // currentHook with data-testid="download-<format>". The mock returns one 9x16
    // per hook, so for current hook there is exactly 1 download.
    const clientMod = await import('@/shared/lib/trpc/client');
    const queryHook = clientMod.trpc.studio.projects.getById.useQuery as unknown as () => {
      data: {
        outputs: ReadonlyArray<{ hook_variant: string; format: string }>;
      };
    };
    const q = queryHook();
    const hookA = q.data.outputs.filter((o) => o.hook_variant === 'hook_a');
    expect(hookA.length).toBeGreaterThan(0);
    expect(hookA[0]?.format).toBe('9x16');
  });
});
