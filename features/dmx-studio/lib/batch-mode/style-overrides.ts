// F14.F.5 Sprint 4 — DMX Studio Batch Mode A/B style overrides canon.
// 3 style canon: lujo, familiar, inversionista. Pure constants used to
// override director brief defaults when cloning project for batch generation.
// Agency plan only — gating enforced in createBatchAB.

export const BATCH_STYLE_KEYS = ['lujo', 'familiar', 'inversionista'] as const;
export type BatchStyleKey = (typeof BATCH_STYLE_KEYS)[number];

export interface BatchStyleOverride {
  readonly key: BatchStyleKey;
  readonly displayName: string;
  readonly camera: 'static' | 'slow_pan' | 'dolly_in' | 'orbit';
  readonly colorGrade: 'cinematic' | 'warm' | 'neutral' | 'editorial';
  readonly musicMood: 'elegant' | 'uplifting' | 'corporate' | 'serene';
  readonly styleTemplateKey: string;
  readonly narrationTone: 'aspiracional' | 'cercano' | 'formal';
}

export const STYLE_OVERRIDES: Readonly<Record<BatchStyleKey, BatchStyleOverride>> = {
  lujo: {
    key: 'lujo',
    displayName: 'Lujo',
    camera: 'orbit',
    colorGrade: 'editorial',
    musicMood: 'elegant',
    styleTemplateKey: 'luxe_editorial',
    narrationTone: 'aspiracional',
  },
  familiar: {
    key: 'familiar',
    displayName: 'Familiar',
    camera: 'slow_pan',
    colorGrade: 'warm',
    musicMood: 'uplifting',
    styleTemplateKey: 'family_friendly',
    narrationTone: 'cercano',
  },
  inversionista: {
    key: 'inversionista',
    displayName: 'Inversionista',
    camera: 'static',
    colorGrade: 'neutral',
    musicMood: 'corporate',
    styleTemplateKey: 'investor_pitch',
    narrationTone: 'formal',
  },
} as const;

export function getStyleOverride(key: BatchStyleKey): BatchStyleOverride {
  return STYLE_OVERRIDES[key];
}
