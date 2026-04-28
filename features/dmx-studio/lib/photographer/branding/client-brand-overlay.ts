// F14.F.10 Sprint 9 BIBLIA — Apply cliente asesor brand kit a video unbranded.
// Cliente asesor recibe video sin branding del fotógrafo y aplica SU brand kit
// (logo + colors + nombre + phone) en download via FFmpeg overlay.
// Compose F14.F.3 applyBrandingOverlay (read-only) — NO duplicar lógica FFmpeg.

import {
  type ApplyBrandingResult,
  applyBrandingOverlay,
  type BrandKitOverlay,
} from '@/features/dmx-studio/lib/assembler/branding';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface ClientBrandKit {
  readonly logoUrl: string | null;
  readonly displayName: string | null;
  readonly contactPhone: string | null;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly accentColor: string | null;
  readonly introText: string | null;
  readonly outroText: string | null;
}

export interface ApplyClientBrandKitInput {
  readonly videoUrl: string;
  readonly outputPath: string;
  readonly clientBrandKit: ClientBrandKit;
  readonly durationSeconds: number;
}

export interface ApplyClientBrandKitResult extends ApplyBrandingResult {
  readonly clientBranded: true;
}

function toOverlay(kit: ClientBrandKit): BrandKitOverlay {
  return {
    logoUrl: kit.logoUrl,
    displayName: kit.displayName,
    contactPhone: kit.contactPhone,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor,
    introText: kit.introText,
    outroText: kit.outroText,
  };
}

function isBrandKitEmpty(kit: ClientBrandKit): boolean {
  return (
    kit.logoUrl === null &&
    kit.displayName === null &&
    kit.contactPhone === null &&
    kit.primaryColor === null &&
    kit.secondaryColor === null &&
    kit.accentColor === null &&
    kit.introText === null &&
    kit.outroText === null
  );
}

/**
 * Apply cliente asesor brand kit sobre video unbranded del fotógrafo.
 * Throws si brand kit vacío (cliente debe configurar brand kit antes de download
 * branded; flow alternativo: download unbranded raw via studio_video_outputs).
 */
export async function applyClientBrandKit(
  input: ApplyClientBrandKitInput,
): Promise<ApplyClientBrandKitResult> {
  if (isBrandKitEmpty(input.clientBrandKit)) {
    throw new Error(
      'client_brand_overlay.empty_brand_kit: configure brand kit before branded download',
    );
  }

  try {
    const result = await applyBrandingOverlay({
      sourceVideoPath: input.videoUrl,
      outputPath: input.outputPath,
      brandKit: toOverlay(input.clientBrandKit),
      durationSeconds: input.durationSeconds,
    });

    return {
      ...result,
      clientBranded: true,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.photographer.branding', op: 'applyClientBrandKit' },
      extra: { videoUrl: input.videoUrl, outputPath: input.outputPath },
    });
    throw err;
  }
}

export const __test__ = {
  isBrandKitEmpty,
  toOverlay,
};
