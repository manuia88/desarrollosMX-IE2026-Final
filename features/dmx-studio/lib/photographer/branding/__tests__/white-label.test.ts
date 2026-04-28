// F14.F.10 Sprint 9 BIBLIA — Tests white-label config + apply.
// Modo A canon: mocks supabase admin.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  __test__,
  applyWhiteLabelToOutput,
  configureWhiteLabel,
  type PhotographerWhiteLabelConfig,
} from '../white-label';

interface MockUpdateOpts {
  readonly photographer?: {
    id: string;
    slug: string;
    white_label_enabled: boolean;
    white_label_custom_footer: string | null;
  } | null;
  readonly updateError?: { message: string } | null;
}

function mockSupabaseUpdate(opts: MockUpdateOpts): void {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_photographers') {
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: opts.photographer ?? null,
                error: opts.updateError ?? null,
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });

  vi.mocked(createAdminClient).mockReturnValue({
    from: fromMock,
  } as unknown as ReturnType<typeof createAdminClient>);
}

describe('photographer/branding/white-label', () => {
  it('configureWhiteLabel enable=true persiste customFooter y devuelve slugBasedUrl', async () => {
    mockSupabaseUpdate({
      photographer: {
        id: 'ph-1',
        slug: 'manu-studio',
        white_label_enabled: true,
        white_label_custom_footer: 'Manu Studio Fotografía',
      },
    });

    const result = await configureWhiteLabel({
      photographerId: 'ph-1',
      enabled: true,
      customFooter: 'Manu Studio Fotografía',
    });

    expect(result.enabled).toBe(true);
    expect(result.customFooter).toBe('Manu Studio Fotografía');
    expect(result.slugBasedUrl).toBe('/studio/foto/manu-studio');
  });

  it('configureWhiteLabel enable=false limpia customFooter (null)', async () => {
    mockSupabaseUpdate({
      photographer: {
        id: 'ph-1',
        slug: 'manu-studio',
        white_label_enabled: false,
        white_label_custom_footer: null,
      },
    });

    const result = await configureWhiteLabel({
      photographerId: 'ph-1',
      enabled: false,
      customFooter: null,
    });

    expect(result.enabled).toBe(false);
    expect(result.customFooter).toBeNull();
    expect(result.slugBasedUrl).toBe('/studio/foto/manu-studio');
  });

  it('configureWhiteLabel rechaza customFooter > 200 chars (plan validation footer length)', async () => {
    mockSupabaseUpdate({
      photographer: {
        id: 'ph-1',
        slug: 'manu-studio',
        white_label_enabled: true,
        white_label_custom_footer: null,
      },
    });

    const longFooter = 'a'.repeat(201);
    await expect(
      configureWhiteLabel({
        photographerId: 'ph-1',
        enabled: true,
        customFooter: longFooter,
      }),
    ).rejects.toThrow('footer_too_long');
  });

  it('applyWhiteLabelToOutput usa custom_footer cuando enabled+footer, default cuando off — slug-based URL siempre presente', () => {
    const enabledConfig: PhotographerWhiteLabelConfig = {
      slug: 'manu-studio',
      whiteLabelEnabled: true,
      whiteLabelCustomFooter: 'Manu Studio',
    };
    const disabledConfig: PhotographerWhiteLabelConfig = {
      slug: 'otro-studio',
      whiteLabelEnabled: false,
      whiteLabelCustomFooter: 'Ignored Footer',
    };

    const enabledOutput = applyWhiteLabelToOutput('https://cdn/v.mp4', enabledConfig);
    expect(enabledOutput.isWhiteLabel).toBe(true);
    expect(enabledOutput.footerText).toBe('Manu Studio');
    expect(enabledOutput.slugBasedUrl).toBe('/studio/foto/manu-studio');

    const disabledOutput = applyWhiteLabelToOutput('https://cdn/v.mp4', disabledConfig);
    expect(disabledOutput.isWhiteLabel).toBe(false);
    expect(disabledOutput.footerText).toBe(__test__.DEFAULT_DMX_FOOTER);
    expect(disabledOutput.slugBasedUrl).toBe('/studio/foto/otro-studio');
  });
});
