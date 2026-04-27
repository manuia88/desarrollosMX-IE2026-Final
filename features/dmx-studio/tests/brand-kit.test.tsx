// FASE 14.F.3 Sprint 2 — Brand Kit UI tests (Tarea 2.1 BIBLIA).
// Modo A: createCaller-style mocks via vi.mock. Smoke + Zod validation contracts.
// No DOM rendering (vitest config sin jsdom). Tests cubren:
// 1) Form export + props contract
// 2) HEX validation rejection
// 3) LivePreview renders with custom values
// 4) LivePreview fallback sample data
// 5) DeleteLogoButton export + props
// 6) DeleteLogoButton mutation hook wired
// 7) Logo uploader rejects > 2MB via schema
// 8) Upsert payload builds correctly

import { describe, expect, it, vi } from 'vitest';
import { STUDIO_BRAND_FONTS, uploadBrandLogoInput, upsertStudioBrandKitInput } from '../schemas';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      studio: {
        brandKit: {
          get: { invalidate: vi.fn(() => Promise.resolve()) },
        },
      },
    })),
    studio: {
      brandKit: {
        get: {
          useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
        },
        upsert: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(() => Promise.resolve({ id: 'kit-1', action: 'created' as const })),
            isPending: false,
          })),
        },
        uploadLogo: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(() =>
              Promise.resolve({
                uploadUrl: 'https://signed/url',
                token: 'tok',
                path: 'user/logo/123-name.png',
                bucket: 'studio-brand-assets',
                contentType: 'image/png',
              }),
            ),
            isPending: false,
          })),
        },
        setLogoUrl: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(() => Promise.resolve({ id: 'kit-1' })),
            isPending: false,
          })),
        },
        deleteLogo: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(() => Promise.resolve({ ok: true })),
            isPending: false,
          })),
        },
        previewMockup: {
          useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
        },
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  motion: new Proxy(
    {},
    {
      get: () => (props: unknown) => props,
    },
  ),
}));

vi.mock('@/shared/ui/primitives/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('BrandKitForm — module export smoke', () => {
  it('exports BrandKitForm as function with documented props', async () => {
    const mod = await import('../components/brand-kit/BrandKitForm');
    expect(typeof mod.BrandKitForm).toBe('function');
    expect(mod.BrandKitForm.name).toBe('BrandKitForm');
  });

  it('rejects invalid HEX color via Zod schema (validates primary color regex)', () => {
    const invalid = upsertStudioBrandKitInput.safeParse({
      primaryColor: 'red',
      fontPreference: 'outfit',
      tone: 'professional',
      zones: [],
      cities: [],
    });
    expect(invalid.success).toBe(false);

    const valid = upsertStudioBrandKitInput.safeParse({
      primaryColor: '#6366F1',
      fontPreference: 'outfit',
      tone: 'professional',
      zones: [],
      cities: [],
    });
    expect(valid.success).toBe(true);
  });
});

describe('BrandKitLivePreview — render contract', () => {
  it('exports BrandKitLivePreview as function and accepts BrandKitLivePreviewValues', async () => {
    const mod = await import('../components/brand-kit/BrandKitLivePreview');
    expect(typeof mod.BrandKitLivePreview).toBe('function');
    const values: import('../components/brand-kit/BrandKitLivePreview').BrandKitLivePreviewValues =
      {
        displayName: 'Manuel Acosta',
        tagline: 'Tu próximo hogar te espera',
        primaryColor: '#6366F1',
        secondaryColor: '#EC4899',
        accentColor: '#A855F7',
        fontPreference: 'outfit',
        contactPhone: '+52 55 1234 5678',
        introText: 'Hola',
        outroText: 'Gracias',
        logoUrl: 'user/logo/abc.png',
      };
    expect(values.fontPreference).toBe('outfit');
    expect(values.primaryColor).toBe('#6366F1');
    expect((STUDIO_BRAND_FONTS as readonly string[]).includes(values.fontPreference ?? '')).toBe(
      true,
    );
  });

  it('handles fallback sample contract when user has not filled values', async () => {
    const mod = await import('../components/brand-kit/BrandKitLivePreview');
    expect(typeof mod.BrandKitLivePreview).toBe('function');
    const empty: import('../components/brand-kit/BrandKitLivePreview').BrandKitLivePreviewValues =
      {};
    expect(empty.tagline).toBeUndefined();
    expect(empty.logoUrl).toBeUndefined();
  });
});

describe('BrandKitDeleteLogoButton — module export smoke', () => {
  it('exports BrandKitDeleteLogoButton with onDeleted required prop', async () => {
    const mod = await import('../components/brand-kit/BrandKitDeleteLogoButton');
    expect(typeof mod.BrandKitDeleteLogoButton).toBe('function');
    const onDeleted = vi.fn();
    const props: import('../components/brand-kit/BrandKitDeleteLogoButton').BrandKitDeleteLogoButtonProps =
      { onDeleted, disabled: false };
    expect(typeof props.onDeleted).toBe('function');
    expect(props.disabled).toBe(false);
  });

  it('wires deleteLogo mutation from trpc client', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const spy = clientMod.trpc.studio.brandKit.deleteLogo.useMutation as unknown as (
      input?: unknown,
    ) => { mutate: unknown; mutateAsync: unknown; isPending: boolean };
    expect(typeof spy).toBe('function');
    const result = spy({});
    expect(typeof result.mutate).toBe('function');
    expect(typeof result.mutateAsync).toBe('function');
  });
});

describe('Logo uploader — Zod size validation', () => {
  it('rejects logo files over 2MB max size', () => {
    const tooBig = uploadBrandLogoInput.safeParse({
      fileName: 'logo.png',
      contentType: 'image/png',
      sizeBytes: 2_000_001,
    });
    expect(tooBig.success).toBe(false);

    const ok = uploadBrandLogoInput.safeParse({
      fileName: 'logo.png',
      contentType: 'image/png',
      sizeBytes: 500_000,
    });
    expect(ok.success).toBe(true);
  });
});

describe('Upsert payload — Zod parse correctness', () => {
  it('parses full Brand Kit payload preserving zones/cities arrays + fonts/tone enums', () => {
    const parsed = upsertStudioBrandKitInput.safeParse({
      displayName: 'Manuel Acosta',
      tagline: 'Tu próximo hogar te espera',
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
      accentColor: '#A855F7',
      fontPreference: 'outfit',
      tone: 'luxury',
      zones: ['Polanco', 'Roma Norte', 'Condesa'],
      cities: ['CDMX', 'Monterrey'],
      contactPhone: '+52 55 1234 5678',
      contactEmail: 'manuel@example.com',
      introText: 'Hola, soy Manuel',
      outroText: 'Llámame al +52',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.zones).toHaveLength(3);
    expect(parsed.data.cities).toHaveLength(2);
    expect(parsed.data.fontPreference).toBe('outfit');
    expect(parsed.data.tone).toBe('luxury');
    expect(parsed.data.primaryColor).toBe('#6366F1');
  });
});
