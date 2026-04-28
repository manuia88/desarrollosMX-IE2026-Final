// FASE 15 v3 — M13 CRM Dev schemas (Zod single source of truth)
// Reference: ADR-053 (unified pattern) + ADR-060 (B.6/B.7 onyx-benchmarked)
//
// 5 stages canon: lead → interes → visita → oferta → cierre.
// Schema canon: tabla `leads` (BD pre-fix shipped commit c8805da).

import { z } from 'zod';

export const LEAD_STAGES = ['lead', 'interes', 'visita', 'oferta', 'cierre'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = [
  'landing',
  'inmuebles24',
  'mercadolibre',
  'facebook',
  'whatsapp',
  'walk_in',
  'referido',
  'evento',
  'otro',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

const stageSchema = z.enum(LEAD_STAGES);
const sourceSchema = z.enum(LEAD_SOURCES);

export const listLeadsInput = z.object({
  proyectoId: z.string().uuid().optional(),
  stage: stageSchema.optional(),
  assignedAsesorId: z.string().uuid().optional(),
  q: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});
export type ListLeadsInput = z.infer<typeof listLeadsInput>;

export const createLeadInput = z.object({
  contactName: z.string().min(1).max(120),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(4).max(40).optional(),
  countryCode: z.string().length(2).default('MX'),
  zoneId: z.string().uuid(),
  source: sourceSchema,
  proyectoId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadInput>;

export const updateLeadInput = z.object({
  leadId: z.string().uuid(),
  contactName: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().min(4).max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadInput>;

export const updateLeadStageInput = z.object({
  leadId: z.string().uuid(),
  stage: stageSchema,
});
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageInput>;

export const assignAsesorInput = z.object({
  leadId: z.string().uuid(),
  asesorId: z.string().uuid().nullable(),
});
export type AssignAsesorInput = z.infer<typeof assignAsesorInput>;

export const getLeadTimelineInput = z.object({
  leadId: z.string().uuid(),
});
export type GetLeadTimelineInput = z.infer<typeof getLeadTimelineInput>;

// B.7 Journey builder schemas

export const JOURNEY_TRIGGER_EVENTS = [
  'lead_created',
  'lead_score_changed',
  'visit_scheduled',
  'offer_sent',
  'days_no_activity',
  'aniversary_apartado',
] as const;
export type JourneyTriggerEvent = (typeof JOURNEY_TRIGGER_EVENTS)[number];

export const JOURNEY_STEP_TYPES = ['send_email', 'send_wa', 'wait', 'conditional'] as const;
export type JourneyStepType = (typeof JOURNEY_STEP_TYPES)[number];

export const journeyStepSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send_email'),
    templateId: z.string().min(1),
    subject: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal('send_wa'),
    waTemplateId: z.string().min(1),
  }),
  z.object({
    type: z.literal('wait'),
    waitHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 365),
  }),
  z.object({
    type: z.literal('conditional'),
    condition: z.object({
      field: z.enum(['lead_score', 'has_offer', 'days_inactive']),
      op: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
      value: z.number(),
    }),
    thenStep: z.number().int().min(0),
    elseStep: z.number().int().min(0),
  }),
]);
export type JourneyStep = z.infer<typeof journeyStepSchema>;

export const listJourneysInput = z.object({
  proyectoId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});
export type ListJourneysInput = z.infer<typeof listJourneysInput>;

export const createJourneyInput = z.object({
  name: z.string().min(1).max(120),
  proyectoId: z.string().uuid().optional(),
  triggerEvent: z.enum(JOURNEY_TRIGGER_EVENTS),
  audienceFilter: z.record(z.string(), z.unknown()).default({}),
  steps: z.array(journeyStepSchema).min(1).max(20),
});
export type CreateJourneyInput = z.infer<typeof createJourneyInput>;

export const updateJourneyInput = z.object({
  journeyId: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  triggerEvent: z.enum(JOURNEY_TRIGGER_EVENTS).optional(),
  audienceFilter: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(journeyStepSchema).min(1).max(20).optional(),
  active: z.boolean().optional(),
});
export type UpdateJourneyInput = z.infer<typeof updateJourneyInput>;

export const pauseJourneyInput = z.object({
  journeyId: z.string().uuid(),
});
export type PauseJourneyInput = z.infer<typeof pauseJourneyInput>;

export const getJourneyExecutionsInput = z.object({
  journeyId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type GetJourneyExecutionsInput = z.infer<typeof getJourneyExecutionsInput>;

export const enrollLeadInJourneyInput = z.object({
  journeyId: z.string().uuid(),
  leadId: z.string().uuid(),
});
export type EnrollLeadInJourneyInput = z.infer<typeof enrollLeadInJourneyInput>;

// Stage <-> leads.status mapping (BD `leads.status` is free-form text, default '').
// Canon mapping documented here for engine + UI parity.
export function stageToStatus(stage: LeadStage): string {
  return stage;
}

export function statusToStage(status: string | null | undefined): LeadStage {
  const s = String(status ?? '').toLowerCase();
  if ((LEAD_STAGES as readonly string[]).includes(s)) {
    return s as LeadStage;
  }
  return 'lead';
}
