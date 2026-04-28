// F14.F.7 Sprint 6 Tarea 6.5 — Cinema Mode config + prerequisites validator.
// Pure functions: zero IO, zero hooks. Used by tRPC sprint6 router
// (cinemaMode.enable) and UI CinemaModeToggle / Sprint6FeatureToggles.

export const CINEMA_MODE_FEATURES = [
  'drone_reveal',
  'seedance_ambient',
  'branded_overlay',
  'multi_format',
  'beat_sync',
] as const;

export type CinemaModeFeature = (typeof CINEMA_MODE_FEATURES)[number];

export type CinemaModeMultiFormat = '9x16' | '1x1' | '16x9';

export interface CinemaModeConfig {
  readonly features: ReadonlyArray<CinemaModeFeature>;
  readonly dronePattern: 'reveal' | string;
  readonly ambientContext: 'auto' | string;
  readonly brandedOverlay: true;
  readonly multiFormat: ReadonlyArray<CinemaModeMultiFormat>;
  readonly beatSync: true;
}

export interface BuildCinemaModeConfigOptions {
  readonly droneOverride?: string;
  readonly ambientOverride?: string;
}

const DEFAULT_MULTI_FORMAT: ReadonlyArray<CinemaModeMultiFormat> = ['9x16', '1x1', '16x9'];

export function buildCinemaModeConfig(opts?: BuildCinemaModeConfigOptions): CinemaModeConfig {
  const dronePattern =
    opts?.droneOverride && opts.droneOverride.length > 0 ? opts.droneOverride : 'reveal';
  const ambientContext =
    opts?.ambientOverride && opts.ambientOverride.length > 0 ? opts.ambientOverride : 'auto';

  return {
    features: CINEMA_MODE_FEATURES,
    dronePattern,
    ambientContext,
    brandedOverlay: true,
    multiFormat: DEFAULT_MULTI_FORMAT,
    beatSync: true,
  };
}

export interface CinemaModePrerequisitesInput {
  readonly hasDroneAsset: boolean;
  readonly hasSeedanceAccess: boolean;
  readonly hasBrandKit: boolean;
}

export interface CinemaModePrerequisitesResult {
  readonly valid: boolean;
  readonly missing: ReadonlyArray<string>;
}

export function validateCinemaModePrerequisites(
  input: CinemaModePrerequisitesInput,
): CinemaModePrerequisitesResult {
  const missing: string[] = [];
  if (!input.hasDroneAsset) {
    missing.push('drone_asset');
  }
  if (!input.hasSeedanceAccess) {
    missing.push('seedance_access');
  }
  if (!input.hasBrandKit) {
    missing.push('brand_kit');
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}
