// DMX Studio dentro DMX único entorno (ADR-054). Kling video model config canon.
// Kling 3.0 emergerá en Replicate Q3 2026 esperado; H1 usa Kling 2.1 vigente.
// Fuente Replicate marketplace abril 2026: kwaivgi/kling-v2.1.

export const DEFAULT_KLING_MODEL = 'kwaivgi/kling-v2.1' as const;

export type KlingModelSlug = typeof DEFAULT_KLING_MODEL;

export const KLING_DEFAULT_DURATION_SECONDS = 5 as const;

export const KLING_DEFAULT_ASPECT_RATIO = '16:9' as const;

export type KlingAspectRatio = '16:9' | '9:16' | '1:1';

// BIBLIA v4 cost ref ~$0.30 por clip 5s Kling 3.0; H1 Kling 2.1 budget similar.
export const KLING_COST_PER_SECOND_USD = 0.06 as const;

export type KlingCameraMovement =
  | 'none'
  | 'pan_left'
  | 'pan_right'
  | 'zoom_in'
  | 'zoom_out'
  | 'tilt_up'
  | 'tilt_down';
