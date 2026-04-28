// DMX Studio feature flags canon (BIBLIA v4 sprint plan + ADR-054 lock canon).
// DMX Studio dentro DMX único entorno: flags evaluados en runtime via process.env.
// Memoria canon zero gasto sin validación: todos default false hasta primer cliente.

export type StudioFeatureKey =
  | 'ELEVENLABS_VOICE_CLONE_ENABLED'
  | 'SEEDANCE_ENABLED'
  | 'VIRTUAL_STAGING_ENABLED'
  | 'DRONE_SIM_ENABLED'
  | 'CINEMA_MODE_ENABLED'
  | 'HEYGEN_AVATAR_ENABLED'
  | 'DEEPGRAM_TRANSCRIPTION_ENABLED'
  | 'SERIES_MODE_ENABLED'
  | 'PORTAL_SCRAPER_ENABLED'
  | 'SOCIAL_PUBLISHING_ENABLED'
  | 'INSTAGRAM_PUBLISH_ENABLED'
  | 'TIKTOK_PUBLISH_ENABLED'
  | 'FACEBOOK_PUBLISH_ENABLED';

export const FEATURE_FLAGS: Readonly<Record<StudioFeatureKey, boolean>> = {
  ELEVENLABS_VOICE_CLONE_ENABLED: process.env.ELEVENLABS_VOICE_CLONE_ENABLED === 'true',
  SEEDANCE_ENABLED: process.env.SEEDANCE_ENABLED === 'true',
  VIRTUAL_STAGING_ENABLED: process.env.VIRTUAL_STAGING_ENABLED === 'true',
  DRONE_SIM_ENABLED: process.env.DRONE_SIM_ENABLED === 'true',
  CINEMA_MODE_ENABLED: process.env.CINEMA_MODE_ENABLED === 'true',
  HEYGEN_AVATAR_ENABLED: process.env.HEYGEN_AVATAR_ENABLED === 'true',
  DEEPGRAM_TRANSCRIPTION_ENABLED: process.env.DEEPGRAM_TRANSCRIPTION_ENABLED === 'true',
  SERIES_MODE_ENABLED: process.env.SERIES_MODE_ENABLED === 'true',
  PORTAL_SCRAPER_ENABLED: process.env.PORTAL_SCRAPER_ENABLED === 'true',
  SOCIAL_PUBLISHING_ENABLED: process.env.SOCIAL_PUBLISHING_ENABLED === 'true',
  INSTAGRAM_PUBLISH_ENABLED: process.env.INSTAGRAM_PUBLISH_ENABLED === 'true',
  TIKTOK_PUBLISH_ENABLED: process.env.TIKTOK_PUBLISH_ENABLED === 'true',
  FACEBOOK_PUBLISH_ENABLED: process.env.FACEBOOK_PUBLISH_ENABLED === 'true',
} as const;

export function shouldUseFeature(key: StudioFeatureKey): boolean {
  return FEATURE_FLAGS[key];
}

export const FEATURE_FLAG_SPRINT_MAP: Readonly<Record<StudioFeatureKey, string>> = {
  ELEVENLABS_VOICE_CLONE_ENABLED: 'Sprint 4 (activable cuando primer cliente Pro suscribe)',
  SEEDANCE_ENABLED: 'Sprint 6 H1 (Agency-only)',
  VIRTUAL_STAGING_ENABLED: 'Sprint 6 H1 (Agency-only)',
  DRONE_SIM_ENABLED: 'Sprint 6 H1 (Agency-only)',
  CINEMA_MODE_ENABLED: 'Sprint 6 H1 (Agency-only, combina seedance + drone + branding)',
  HEYGEN_AVATAR_ENABLED: 'Sprint 7 H2',
  DEEPGRAM_TRANSCRIPTION_ENABLED: 'Sprint 5 H2',
  SERIES_MODE_ENABLED: 'Sprint 8 H2',
  PORTAL_SCRAPER_ENABLED: 'Sprint 3 H2',
  SOCIAL_PUBLISHING_ENABLED: 'Sprint 11+12 H2 (post-aprobación API + PMF validation)',
  INSTAGRAM_PUBLISH_ENABLED: 'Sprint 11+12 H2 (post-aprobación API + PMF validation)',
  TIKTOK_PUBLISH_ENABLED: 'Sprint 11+12 H2 (post-aprobación API + PMF validation)',
  FACEBOOK_PUBLISH_ENABLED: 'Sprint 11+12 H2 (post-aprobación API + PMF validation)',
} as const;

export const AGENCY_PLAN_KEY = 'agency';

export function isAgencyPlan(planKey: string | null | undefined): boolean {
  return planKey === AGENCY_PLAN_KEY;
}
