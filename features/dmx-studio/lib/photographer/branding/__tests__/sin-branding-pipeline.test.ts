// F14.F.10 Sprint 9 BIBLIA — Tests sin-branding-pipeline (Plan Fotógrafo).
// Modo A canon (memoria 27): mocks supabase + applyUnbrandedExport, NO real DB.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));
vi.mock('@/features/dmx-studio/lib/assembler/branding', () => ({
  applyUnbrandedExport: vi.fn(),
}));

import { applyUnbrandedExport } from '@/features/dmx-studio/lib/assembler/branding';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { generateUnbrandedVideo } from '../sin-branding-pipeline';

interface MockSupabaseOptions {
  readonly photographer?: { id: string; user_id: string } | null;
  readonly photographerError?: { message: string } | null;
  readonly insertError?: { message: string } | null;
}

function mockSupabase(opts: MockSupabaseOptions): void {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_photographers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.photographer ?? null,
              error: opts.photographerError ?? null,
            }),
          }),
        }),
      };
    }
    if (table === 'studio_video_outputs') {
      return {
        insert: async () => ({ error: opts.insertError ?? null }),
      };
    }
    return {};
  });

  vi.mocked(createAdminClient).mockReturnValue({
    from: fromMock,
  } as unknown as ReturnType<typeof createAdminClient>);
}

describe('photographer/branding/sin-branding-pipeline', () => {
  it('generateUnbrandedVideo persiste output con is_branded=false', async () => {
    mockSupabase({
      photographer: { id: 'ph-1', user_id: 'user-1' },
    });
    vi.mocked(applyUnbrandedExport).mockResolvedValue({
      ok: true,
      outputPath: '/out/video.mp4',
      hasBrandingOverlay: false,
    });

    const result = await generateUnbrandedVideo({
      projectId: 'proj-1',
      photographerId: 'ph-1',
      sourceVideoPath: '/src/raw.mp4',
      outputPath: '/out/video.mp4',
    });

    expect(result.ok).toBe(true);
    expect(result.isBranded).toBe(false);
    expect(result.hasBrandingOverlay).toBe(false);
    expect(result.outputPath).toBe('/out/video.mp4');
  });

  it('generateUnbrandedVideo lanza error cuando photographer no existe', async () => {
    mockSupabase({ photographer: null });
    vi.mocked(applyUnbrandedExport).mockResolvedValue({
      ok: true,
      outputPath: '/out/video.mp4',
      hasBrandingOverlay: false,
    });

    await expect(
      generateUnbrandedVideo({
        projectId: 'proj-1',
        photographerId: 'ph-missing',
        sourceVideoPath: '/src/raw.mp4',
        outputPath: '/out/video.mp4',
      }),
    ).rejects.toThrow('photographer_not_found');
  });

  it('generateUnbrandedVideo lanza si exporter retorna hasBrandingOverlay=true', async () => {
    mockSupabase({
      photographer: { id: 'ph-1', user_id: 'user-1' },
    });
    vi.mocked(applyUnbrandedExport).mockResolvedValue({
      ok: true,
      outputPath: '/out/video.mp4',
      hasBrandingOverlay: true, // Estado inválido para sin-branding pipeline.
    });

    await expect(
      generateUnbrandedVideo({
        projectId: 'proj-1',
        photographerId: 'ph-1',
        sourceVideoPath: '/src/raw.mp4',
        outputPath: '/out/video.mp4',
      }),
    ).rejects.toThrow('unexpected_export_state');
  });
});
