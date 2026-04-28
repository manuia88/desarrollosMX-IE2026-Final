'use client';

import { trpc } from '@/shared/lib/trpc/client';

// NOTE: pattern same as features/asesor-captaciones/hooks/use-captacion-mutations.ts —
// no inline onSuccess, components invalidate manually via utils.

export function useDevLeads(input: Parameters<typeof trpc.crmDev.listLeads.useQuery>[0]) {
  return trpc.crmDev.listLeads.useQuery(input);
}

export function useCreateDevLead() {
  return trpc.crmDev.createLead.useMutation();
}

export function useUpdateDevLead() {
  return trpc.crmDev.updateLead.useMutation();
}

export function useUpdateDevLeadStage() {
  return trpc.crmDev.updateLeadStage.useMutation();
}

export function useAssignAsesor() {
  return trpc.crmDev.assignAsesor.useMutation();
}

export function useDevLeadTimeline(leadId: string | null) {
  return trpc.crmDev.getLeadTimeline.useQuery(
    { leadId: leadId ?? '00000000-0000-0000-0000-000000000000' },
    { enabled: !!leadId },
  );
}

export function useDevLeadScore(leadId: string | null) {
  return trpc.ieScores.getLeadScore.useQuery(
    { leadId: leadId ?? '00000000-0000-0000-0000-000000000000' },
    { enabled: !!leadId },
  );
}

export function useRecomputeLeadScore() {
  return trpc.ieScores.recomputeLeadScore.useMutation();
}

export function useDevJourneys(input: Parameters<typeof trpc.crmDev.listJourneys.useQuery>[0]) {
  return trpc.crmDev.listJourneys.useQuery(input);
}

export function useCreateJourney() {
  return trpc.crmDev.createJourney.useMutation();
}

export function useUpdateJourney() {
  return trpc.crmDev.updateJourney.useMutation();
}

export function usePauseJourney() {
  return trpc.crmDev.pauseJourney.useMutation();
}

export function useEnrollLeadInJourney() {
  return trpc.crmDev.enrollLeadInJourney.useMutation();
}

export function useInvalidateCrmDevQueries() {
  const utils = trpc.useUtils();
  return {
    invalidateLeads: () => {
      utils.crmDev.listLeads.invalidate();
    },
    invalidateLead: (leadId: string) => {
      utils.crmDev.getLeadTimeline.invalidate({ leadId });
      utils.ieScores.getLeadScore.invalidate({ leadId });
      utils.crmDev.listLeads.invalidate();
    },
    invalidateJourneys: () => {
      utils.crmDev.listJourneys.invalidate();
    },
  };
}
