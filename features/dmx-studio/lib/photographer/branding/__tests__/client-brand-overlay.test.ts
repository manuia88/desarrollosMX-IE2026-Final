// F14.F.10 Sprint 9 BIBLIA — Tests client-brand-overlay.
// Modo A canon: mocks applyBrandingOverlay (compose F14.F.3 read-only).

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));
vi.mock('@/features/dmx-studio/lib/assembler/branding', () => ({
  applyBrandingOverlay: vi.fn(),
}));

import { applyBrandingOverlay } from '@/features/dmx-studio/lib/assembler/branding';
import { __test__, applyClientBrandKit, type ClientBrandKit } from '../client-brand-overlay';

const FULL_KIT: ClientBrandKit = {
  logoUrl: 'https://cdn.dmx/asesor-logo.png',
  displayName: 'Asesor Manu',
  contactPhone: '+52 55 1234 5678',
  primaryColor: '#6366F1',
  secondaryColor: '#EC4899',
  accentColor: '#F59E0B',
  introText: 'Asesor Manu presenta',
  outroText: 'Contacto: +52 55 1234 5678',
};

const EMPTY_KIT: ClientBrandKit = {
  logoUrl: null,
  displayName: null,
  contactPhone: null,
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
  introText: null,
  outroText: null,
};

describe('photographer/branding/client-brand-overlay', () => {
  it('applyClientBrandKit invoca applyBrandingOverlay con overlay derivado del kit', async () => {
    vi.mocked(applyBrandingOverlay).mockResolvedValue({
      ok: true,
      outputPath: '/out/branded.mp4',
      hasBrandingOverlay: true,
    });

    const result = await applyClientBrandKit({
      videoUrl: '/src/unbranded.mp4',
      outputPath: '/out/branded.mp4',
      clientBrandKit: FULL_KIT,
      durationSeconds: 30,
    });

    expect(result.ok).toBe(true);
    expect(result.clientBranded).toBe(true);
    expect(result.hasBrandingOverlay).toBe(true);
    expect(applyBrandingOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceVideoPath: '/src/unbranded.mp4',
        outputPath: '/out/branded.mp4',
        durationSeconds: 30,
        brandKit: expect.objectContaining({
          logoUrl: FULL_KIT.logoUrl,
          displayName: FULL_KIT.displayName,
          contactPhone: FULL_KIT.contactPhone,
          primaryColor: FULL_KIT.primaryColor,
        }),
      }),
    );
  });

  it('applyClientBrandKit lanza cuando brand kit está vacío', async () => {
    vi.mocked(applyBrandingOverlay).mockClear();

    await expect(
      applyClientBrandKit({
        videoUrl: '/src/unbranded.mp4',
        outputPath: '/out/branded.mp4',
        clientBrandKit: EMPTY_KIT,
        durationSeconds: 30,
      }),
    ).rejects.toThrow('empty_brand_kit');

    expect(applyBrandingOverlay).not.toHaveBeenCalled();
  });

  it('isBrandKitEmpty detecta kit vacío vs kit con al menos un campo', () => {
    expect(__test__.isBrandKitEmpty(EMPTY_KIT)).toBe(true);
    expect(__test__.isBrandKitEmpty({ ...EMPTY_KIT, displayName: 'X' })).toBe(false);
    expect(__test__.isBrandKitEmpty({ ...EMPTY_KIT, primaryColor: '#000000' })).toBe(false);
  });
});
