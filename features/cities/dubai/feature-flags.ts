// FASE 14.1 — Dubai feature flags (ADR-059 §Step 4 + ADR-018 STUB señales).
// Independiente de features/dmx-studio/lib/feature-flags.ts (Studio scope).
// Defaults H1 = false hasta API key + cron H2 activation.

export const DUBAI_FEATURE_FLAGS: Readonly<Record<string, boolean>> = {
  DUBAI_REELLY_API_ENABLED: false,
  DUBAI_FULL_LOCALE_AR_AE: false,
  DUBAI_DAILY_SYNC_CRON: false,
};

export type DubaiFeatureFlag =
  | 'DUBAI_REELLY_API_ENABLED'
  | 'DUBAI_FULL_LOCALE_AR_AE'
  | 'DUBAI_DAILY_SYNC_CRON';

export function isDubaiFlagEnabled(flag: DubaiFeatureFlag): boolean {
  return DUBAI_FEATURE_FLAGS[flag] === true;
}
