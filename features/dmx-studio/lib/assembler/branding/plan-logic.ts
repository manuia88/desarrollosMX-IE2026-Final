// FASE 14.F.3 Sprint 2 — Branding plan logic (Tarea 2.3 BIBLIA).
// Pro/Agency planes default branded ON; Foto plan default unbranded (reventa).
// userOverride (cuando !== null) gana sobre default del plan.

export type StudioPlan = 'pro' | 'foto' | 'agency';

const BRANDED_BY_DEFAULT: Readonly<Record<StudioPlan, boolean>> = {
  pro: true,
  foto: false,
  agency: true,
};

export function shouldApplyBranding(plan: StudioPlan, userOverride: boolean | null): boolean {
  if (userOverride !== null) return userOverride;
  return BRANDED_BY_DEFAULT[plan];
}

export const __test__ = {
  BRANDED_BY_DEFAULT,
};
