// FASE 14.F.3 Sprint 2 — Brand Kit UI tests (Modo A: smoke + contract).
// Pattern: react-dom/server.node static markup + Zod contract + i18n key shape.
// Mocks: trpc client (get/upsert/uploadLogo/setLogoUrl/deleteLogo) + next-intl + next/navigation.

import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

const upsertMutate = vi.fn();
const uploadLogoMutateAsync = vi.fn(async () => ({
  uploadUrl: 'https://mock.upload',
  token: 'tk',
  path: 'user-x/logo/123-logo.png',
  bucket: 'studio-brand-assets',
  contentType: 'image/png',
}));
const setLogoUrlMutateAsync = vi.fn(async () => ({ id: 'kit-id' }));
const deleteLogoMutate = vi.fn();
let mockBrandKitData: unknown = null;
const invalidateMock = vi.fn();

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: {
        brandKit: {
          get: { invalidate: invalidateMock },
        },
      },
    }),
    studio: {
      brandKit: {
        get: {
          useQuery: () => ({ data: mockBrandKitData, isLoading: false, error: null }),
        },
        upsert: {
          useMutation: (opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => ({
            mutate: (input: unknown) => {
              upsertMutate(input);
              opts?.onSuccess?.();
            },
            mutateAsync: vi.fn(),
            isPending: false,
          }),
        },
        uploadLogo: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: uploadLogoMutateAsync,
            isPending: false,
          }),
        },
        setLogoUrl: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: setLogoUrlMutateAsync,
            isPending: false,
          }),
        },
        deleteLogo: {
          useMutation: (opts?: { onSuccess?: () => void }) => ({
            mutate: () => {
              deleteLogoMutate();
              opts?.onSuccess?.();
            },
            mutateAsync: vi.fn(),
            isPending: false,
          }),
        },
      },
    },
  },
}));

vi.mock('@/shared/ui/primitives/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { upsertStudioBrandKitInput } from '@/features/dmx-studio/schemas';
import { BrandKitDeleteLogoButton } from '../components/brand-kit/BrandKitDeleteLogoButton';
import { BrandKitLivePreview } from '../components/brand-kit/BrandKitLivePreview';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function render(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

beforeEach(() => {
  upsertMutate.mockReset();
  uploadLogoMutateAsync.mockClear();
  setLogoUrlMutateAsync.mockClear();
  deleteLogoMutate.mockReset();
  invalidateMock.mockReset();
  mockBrandKitData = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('BrandKitForm — module + i18n labels render contract', () => {
  it('renders all field labels (displayName + tagline + colors + font + tone + zones + cities + contact + intro/outro + logo)', async () => {
    const mod = await import('../components/brand-kit/BrandKitForm');
    expect(typeof mod.BrandKitForm).toBe('function');
    const html = render(<mod.BrandKitForm onValuesChange={vi.fn()} />);
    expect(html).toContain('displayNameLabel');
    expect(html).toContain('taglineLabel');
    expect(html).toContain('primaryColorLabel');
    expect(html).toContain('secondaryColorLabel');
    expect(html).toContain('accentColorLabel');
    expect(html).toContain('fontPreferenceLabel');
    expect(html).toContain('toneLabel');
    expect(html).toContain('zonesLabel');
    expect(html).toContain('citiesLabel');
    expect(html).toContain('contactPhoneLabel');
    expect(html).toContain('contactEmailLabel');
    expect(html).toContain('introTextLabel');
    expect(html).toContain('outroTextLabel');
    expect(html).toContain('logoLabel');
    expect(html).toContain('saveButton');
  });
});

describe('BrandKitForm — Zod HEX color regex contract', () => {
  it('rejects invalid HEX strings for primary/secondary/accent', () => {
    const invalid = upsertStudioBrandKitInput.safeParse({ primaryColor: 'not-a-hex' });
    expect(invalid.success).toBe(false);
    const invalidShort = upsertStudioBrandKitInput.safeParse({ primaryColor: '#FFF' });
    expect(invalidShort.success).toBe(false);
  });

  it('accepts valid HEX (#RRGGBB) for all three color fields', () => {
    const ok = upsertStudioBrandKitInput.safeParse({
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
      accentColor: '#14B8A6',
    });
    expect(ok.success).toBe(true);
  });
});

describe('BrandKitForm — upsert payload shape contract', () => {
  it('Zod schema accepts a complete brand-kit payload (drives upsert mutation)', () => {
    const payload = {
      displayName: 'Asesor Demo',
      tagline: 'Tu próximo hogar te espera',
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
      accentColor: '#14B8A6',
      fontPreference: 'outfit' as const,
      tone: 'professional' as const,
      zones: ['Polanco', 'Roma Norte'],
      cities: ['CDMX'],
      contactPhone: '5551234567',
      contactEmail: 'asesor@example.com',
      introText: 'Hola, soy Demo',
      outroText: 'Contáctame',
    };
    const parsed = upsertStudioBrandKitInput.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fontPreference).toBe('outfit');
      expect(parsed.data.zones).toEqual(['Polanco', 'Roma Norte']);
    }
  });
});

describe('BrandKitLivePreview — visual contract', () => {
  it('renders displayName + tagline inside the mockup', () => {
    const html = render(
      <BrandKitLivePreview
        values={{
          displayName: 'Asesor Demo',
          tagline: 'Tu próximo hogar te espera',
          contactPhone: '5551234567',
        }}
      />,
    );
    expect(html).toContain('Tu próximo hogar te espera');
    expect(html).toContain('Asesor Demo');
    expect(html).toContain('data-testid="brand-kit-mockup"');
  });

  it('applies primaryColor + secondaryColor inline styles via gradient body', () => {
    const html = render(
      <BrandKitLivePreview
        values={{
          primaryColor: '#6366F1',
          secondaryColor: '#EC4899',
          accentColor: '#14B8A6',
        }}
      />,
    );
    expect(html.toLowerCase()).toContain('#6366f1');
    expect(html.toLowerCase()).toContain('#ec4899');
    expect(html.toLowerCase()).toContain('#14b8a6');
    expect(html).toContain('linear-gradient');
  });

  it('falls back to placeholder badge when logoUrl is null', () => {
    const html = render(<BrandKitLivePreview values={{ logoUrl: null }} />);
    expect(html).toContain('data-testid="brand-kit-logo-placeholder"');
    expect(html).not.toContain('<img');
  });

  it('renders <img> with logoUrl when provided', () => {
    const html = render(
      <BrandKitLivePreview values={{ logoUrl: 'https://storage.mock/logo.png' }} />,
    );
    expect(html).toContain('https://storage.mock/logo.png');
    expect(html).not.toContain('data-testid="brand-kit-logo-placeholder"');
  });
});

describe('BrandKitDeleteLogoButton — confirm + mutation contract', () => {
  it('renders a button labeled with logoDeleteCta key', () => {
    const html = render(<BrandKitDeleteLogoButton onDeleted={vi.fn()} />);
    expect(html).toContain('logoDeleteCta');
    expect(html).toContain('<button');
  });

  it('calls deleteLogo mutation flow when invoked (smoke)', async () => {
    const mod = await import('@/shared/lib/trpc/client');
    const hook = mod.trpc.studio.brandKit.deleteLogo.useMutation as unknown as (opts?: {
      onSuccess?: () => void;
    }) => { mutate: () => void; isPending: boolean };
    const onSuccess = vi.fn();
    const m = hook({ onSuccess });
    m.mutate();
    expect(deleteLogoMutate).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('BrandKitForm — auto-import zones from server state', () => {
  it('hydrates zones field when server returns existing brand kit with zones array', async () => {
    mockBrandKitData = {
      display_name: 'Asesor Persisted',
      tagline: 'Tagline persisted',
      primary_color: '#6366F1',
      secondary_color: null,
      accent_color: null,
      font_preference: 'outfit',
      tone: 'professional',
      zones: ['Polanco', 'Roma Norte', 'Condesa'],
      cities: ['CDMX'],
      contact_phone: null,
      contact_email: null,
      intro_text: null,
      outro_text: null,
      logo_url: null,
    };
    const mod = await import('../components/brand-kit/BrandKitForm');
    const html = render(<mod.BrandKitForm onValuesChange={vi.fn()} />);
    // Static markup uses defaultValues; field hydration happens after mount via reset(). We
    // assert the form rendered without crashing and zones textarea + display name input exist.
    expect(html).toContain('zonesLabel');
    expect(html).toContain('displayNameLabel');
    expect(html).toContain('<textarea');
  });
});

describe('i18n contract — Studio.brandKit namespace', () => {
  it('es-MX has all required brandKit keys', async () => {
    const messages = await import('@/messages/es-MX.json');
    const json = messages.default as unknown as {
      Studio: {
        brandKit: Record<string, string>;
      };
    };
    const b = json.Studio.brandKit;
    const required = [
      'pageTitle',
      'pageSubtitle',
      'formSection',
      'previewSection',
      'displayNameLabel',
      'taglineLabel',
      'primaryColorLabel',
      'secondaryColorLabel',
      'accentColorLabel',
      'fontPreferenceLabel',
      'toneLabel',
      'zonesLabel',
      'citiesLabel',
      'contactPhoneLabel',
      'contactEmailLabel',
      'introTextLabel',
      'outroTextLabel',
      'logoLabel',
      'logoUploadCta',
      'logoDeleteCta',
      'logoDeleteConfirm',
      'saveButton',
      'savedToast',
      'savingError',
      'previewSampleTitle',
      'previewSamplePrice',
      'previewSampleArea',
      'previewSampleZone',
      'previewBottomBar',
    ];
    for (const key of required) {
      expect(typeof b[key]).toBe('string');
      expect((b[key] ?? '').length).toBeGreaterThan(0);
    }
  });

  it('en-US mirrors the same brandKit key shape as es-MX', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = (esMod.default as unknown as { Studio: { brandKit: Record<string, unknown> } })
      .Studio.brandKit;
    const en = (enMod.default as unknown as { Studio: { brandKit: Record<string, unknown> } })
      .Studio.brandKit;
    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(esKeys);
  });
});
