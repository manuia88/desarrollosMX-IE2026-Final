// FASE 15 v3 — M13 CRM Dev router (unified pattern ADR-053).
// B.6 lead score badge consumption + B.7 journey builder procedures.
// BD canon: tabla `leads` (lead_scores FK lead_id → leads.id) + marketing_journeys + journey_executions.

import { TRPCError } from '@trpc/server';
import {
  type AssignAsesorInput,
  assignAsesorInput,
  type CreateJourneyInput,
  type CreateLeadInput,
  createJourneyInput,
  createLeadInput,
  type EnrollLeadInJourneyInput,
  enrollLeadInJourneyInput,
  type GetJourneyExecutionsInput,
  type GetLeadTimelineInput,
  getJourneyExecutionsInput,
  getLeadTimelineInput,
  type ListJourneysInput,
  type ListLeadsInput,
  listJourneysInput,
  listLeadsInput,
  type PauseJourneyInput,
  pauseJourneyInput,
  stageToStatus,
  type UpdateJourneyInput,
  type UpdateLeadInput,
  type UpdateLeadStageInput,
  updateJourneyInput,
  updateLeadInput,
  updateLeadStageInput,
} from '@/features/crm-dev/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { computeLeadScore, persistLeadScore } from '@/shared/lib/scores/c01-lead-score';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database, Json } from '@/shared/types/database';

const ALLOWED_DEV_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);

type AdminClient = ReturnType<typeof createAdminClient>;

interface DevContext {
  readonly userId: string;
  readonly desarrolladoraId: string | null;
  readonly rol: string;
  readonly isPlatformAdmin: boolean;
}

async function requireDevContext(supabase: AdminClient, userId: string): Promise<DevContext> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    sentry.captureException(error, { tags: { feature: 'crm-dev', op: 'requireDevContext' } });
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data || !ALLOWED_DEV_ROLES.has(data.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'developer role required' });
  }

  return {
    userId: data.id,
    desarrolladoraId: data.desarrolladora_id,
    rol: data.rol,
    isPlatformAdmin: data.rol === 'superadmin' || data.rol === 'mb_admin',
  };
}

async function ensureDevDefaultZone(supabase: AdminClient): Promise<string | null> {
  const { data } = await supabase
    .from('zones')
    .select('id')
    .eq('country_code', 'MX')
    .order('level', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function ensureDefaultLeadSource(supabase: AdminClient, slug: string): Promise<string> {
  const { data } = await supabase.from('lead_sources').select('id').eq('slug', slug).maybeSingle();
  if (data?.id) return data.id;
  const { data: fallback } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('active', true)
    .order('attribution_weight', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!fallback?.id) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'no_lead_source_configured',
    });
  }
  return fallback.id;
}

interface DevLead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  source_id: string;
  zone_id: string;
  country_code: string;
  assigned_asesor_id: string | null;
  metadata: Json;
  notes: string | null;
  qualification_score: number;
  created_at: string;
  updated_at: string;
}

async function listLeadsForDev(
  supabase: AdminClient,
  ctx: DevContext,
  input: ListLeadsInput,
): Promise<readonly (DevLead & { score: number | null; tier: 'hot' | 'warm' | 'cold' | null })[]> {
  let query = supabase
    .from('leads')
    .select(
      'id, contact_name, contact_email, contact_phone, status, source_id, zone_id, country_code, assigned_asesor_id, metadata, notes, qualification_score, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (!ctx.isPlatformAdmin && ctx.desarrolladoraId) {
    query = query.filter('metadata->>desarrolladora_id', 'eq', ctx.desarrolladoraId);
  }
  if (input.proyectoId) {
    query = query.filter('metadata->>proyecto_id', 'eq', input.proyectoId);
  }
  if (input.stage) {
    query = query.eq('status', stageToStatus(input.stage));
  }
  if (input.assignedAsesorId) {
    query = query.eq('assigned_asesor_id', input.assignedAsesorId);
  }
  if (input.q && input.q.length > 0) {
    query = query.or(
      `contact_name.ilike.%${input.q}%,contact_email.ilike.%${input.q}%,contact_phone.ilike.%${input.q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }

  const leads = (data ?? []) as DevLead[];
  if (leads.length === 0) return [];

  const ids = leads.map((l) => l.id);
  const { data: scores } = await supabase
    .from('lead_scores')
    .select('lead_id, score')
    .in('lead_id', ids);

  const scoreMap = new Map<string, number>();
  for (const s of scores ?? []) scoreMap.set(s.lead_id, s.score);

  return leads.map((l) => {
    const score = scoreMap.has(l.id) ? (scoreMap.get(l.id) ?? null) : null;
    const tier = score == null ? null : score >= 75 ? 'hot' : score >= 40 ? 'warm' : 'cold';
    return { ...l, score, tier };
  });
}

async function ensureLeadOwned(
  supabase: AdminClient,
  ctx: DevContext,
  leadId: string,
): Promise<DevLead> {
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, contact_name, contact_email, contact_phone, status, source_id, zone_id, country_code, assigned_asesor_id, metadata, notes, qualification_score, created_at, updated_at',
    )
    .eq('id', leadId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'lead_not_found' });
  }
  if (!ctx.isPlatformAdmin) {
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    if (meta.desarrolladora_id !== ctx.desarrolladoraId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'lead_not_in_desarrolladora_scope' });
    }
  }
  return data as DevLead;
}

async function recomputeLeadScoreFireAndForget(
  supabase: AdminClient,
  leadId: string,
): Promise<void> {
  try {
    const result = await computeLeadScore(leadId, { supabase });
    await persistLeadScore(result, { supabase });
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'crm-dev', op: 'recomputeLeadScoreFireAndForget', lead_id: leadId },
    });
  }
}

export const crmDevRouter = router({
  // ===== leads procedures =====
  listLeads: authenticatedProcedure.input(listLeadsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const devCtx = await requireDevContext(supabase, ctx.user.id);
    return listLeadsForDev(supabase, devCtx, input);
  }),

  createLead: authenticatedProcedure
    .input(createLeadInput)
    .mutation(async ({ ctx, input }: { ctx: { user: { id: string } }; input: CreateLeadInput }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      const sourceId = await ensureDefaultLeadSource(supabase, input.source);

      const metadata: Record<string, Json> = {
        desarrolladora_id: devCtx.desarrolladoraId ?? null,
        proyecto_id: input.proyectoId ?? null,
        budget_min: input.budgetMin ?? null,
        budget_max: input.budgetMax ?? null,
        source_slug: input.source,
      };

      type LeadInsert = Database['public']['Tables']['leads']['Insert'];
      const insert: LeadInsert = {
        contact_name: input.contactName,
        contact_email: input.contactEmail ?? null,
        contact_phone: input.contactPhone ?? null,
        country_code: input.countryCode,
        zone_id: input.zoneId,
        source_id: sourceId,
        notes: input.notes ?? null,
        status: 'lead',
        metadata: metadata as Json,
      };

      const { data, error } = await supabase.from('leads').insert(insert).select('id').single();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      void recomputeLeadScoreFireAndForget(supabase, data.id);
      return { leadId: data.id };
    }),

  updateLead: authenticatedProcedure
    .input(updateLeadInput)
    .mutation(async ({ ctx, input }: { ctx: { user: { id: string } }; input: UpdateLeadInput }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      const lead = await ensureLeadOwned(supabase, devCtx, input.leadId);

      type LeadUpdate = Database['public']['Tables']['leads']['Update'];
      const update: LeadUpdate = {};
      if (input.contactName !== undefined) update.contact_name = input.contactName;
      if (input.contactEmail !== undefined) update.contact_email = input.contactEmail;
      if (input.contactPhone !== undefined) update.contact_phone = input.contactPhone;
      if (input.notes !== undefined) update.notes = input.notes;

      if (input.budgetMin !== undefined || input.budgetMax !== undefined) {
        const meta = { ...((lead.metadata ?? {}) as Record<string, Json>) };
        if (input.budgetMin !== undefined) meta.budget_min = input.budgetMin;
        if (input.budgetMax !== undefined) meta.budget_max = input.budgetMax;
        update.metadata = meta as Json;
      }

      const { error } = await supabase.from('leads').update(update).eq('id', input.leadId);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      void recomputeLeadScoreFireAndForget(supabase, input.leadId);
      return { ok: true as const };
    }),

  updateLeadStage: authenticatedProcedure
    .input(updateLeadStageInput)
    .mutation(
      async ({ ctx, input }: { ctx: { user: { id: string } }; input: UpdateLeadStageInput }) => {
        const supabase = createAdminClient();
        const devCtx = await requireDevContext(supabase, ctx.user.id);
        await ensureLeadOwned(supabase, devCtx, input.leadId);

        const { error } = await supabase
          .from('leads')
          .update({ status: stageToStatus(input.stage) })
          .eq('id', input.leadId);
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        void recomputeLeadScoreFireAndForget(supabase, input.leadId);
        return { ok: true as const, stage: input.stage };
      },
    ),

  assignAsesor: authenticatedProcedure
    .input(assignAsesorInput)
    .mutation(
      async ({ ctx, input }: { ctx: { user: { id: string } }; input: AssignAsesorInput }) => {
        const supabase = createAdminClient();
        const devCtx = await requireDevContext(supabase, ctx.user.id);
        await ensureLeadOwned(supabase, devCtx, input.leadId);

        const { error } = await supabase
          .from('leads')
          .update({ assigned_asesor_id: input.asesorId })
          .eq('id', input.leadId);
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        return { ok: true as const };
      },
    ),

  getLeadTimeline: authenticatedProcedure
    .input(getLeadTimelineInput)
    .query(
      async ({ ctx, input }: { ctx: { user: { id: string } }; input: GetLeadTimelineInput }) => {
        const supabase = createAdminClient();
        const devCtx = await requireDevContext(supabase, ctx.user.id);
        const lead = await ensureLeadOwned(supabase, devCtx, input.leadId);

        const { data: scoreRow } = await supabase
          .from('lead_scores')
          .select('lead_id, score, factors, model_version, computed_at, ttl_until')
          .eq('lead_id', input.leadId)
          .maybeSingle();

        const { data: executions } = await supabase
          .from('journey_executions')
          .select(
            'id, journey_id, status, current_step, started_at, last_executed_at, next_run_at, completed_at',
          )
          .eq('lead_id', input.leadId)
          .order('started_at', { ascending: false });

        // STUB ADR-018 — lead_touchpoints table no shipped pre-FASE 15 ola 2.
        // Timeline degraded a 3 fuentes shipped: lead lifecycle + score history + journey events.
        const lifecycleEvents = [
          {
            type: 'lead_created' as const,
            at: lead.created_at,
            payload: { source: lead.source_id, status: lead.status },
          },
          ...(lead.updated_at !== lead.created_at
            ? [
                {
                  type: 'lead_updated' as const,
                  at: lead.updated_at,
                  payload: { status: lead.status },
                },
              ]
            : []),
          ...(scoreRow
            ? [
                {
                  type: 'score_computed' as const,
                  at: scoreRow.computed_at,
                  payload: {
                    score: scoreRow.score,
                    model_version: scoreRow.model_version,
                  },
                },
              ]
            : []),
          ...((executions ?? []).map((e) => ({
            type: 'journey_event' as const,
            at: e.started_at,
            payload: {
              journey_id: e.journey_id,
              status: e.status,
              current_step: e.current_step,
              next_run_at: e.next_run_at,
            },
          })) ?? []),
        ];

        lifecycleEvents.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        return {
          lead,
          score: scoreRow
            ? {
                score: scoreRow.score,
                factors: scoreRow.factors,
                modelVersion: scoreRow.model_version,
                computedAt: scoreRow.computed_at,
                ttlUntil: scoreRow.ttl_until,
              }
            : null,
          executions: executions ?? [],
          events: lifecycleEvents,
          missingSources: ['lead_touchpoints', 'inbox_messages', 'tareas_dev'],
          isPartial: true,
        };
      },
    ),

  ensureDefaultZone: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    await requireDevContext(supabase, ctx.user.id);
    return { zoneId: await ensureDevDefaultZone(supabase) };
  }),

  // ===== B.7 Journey builder procedures =====
  listJourneys: authenticatedProcedure
    .input(listJourneysInput)
    .query(async ({ ctx, input }: { ctx: { user: { id: string } }; input: ListJourneysInput }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);

      let query = supabase
        .from('marketing_journeys')
        .select(
          'id, name, trigger_event, audience_filter, steps, active, proyecto_id, desarrolladora_id, created_by, created_at, updated_at',
        )
        .order('created_at', { ascending: false });

      if (!devCtx.isPlatformAdmin && devCtx.desarrolladoraId) {
        query = query.eq('desarrolladora_id', devCtx.desarrolladoraId);
      }
      if (input.proyectoId) query = query.eq('proyecto_id', input.proyectoId);
      if (input.active !== undefined) query = query.eq('active', input.active);

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  createJourney: authenticatedProcedure
    .input(createJourneyInput)
    .mutation(
      async ({ ctx, input }: { ctx: { user: { id: string } }; input: CreateJourneyInput }) => {
        const supabase = createAdminClient();
        const devCtx = await requireDevContext(supabase, ctx.user.id);

        type JourneyInsert = Database['public']['Tables']['marketing_journeys']['Insert'];
        const insert: JourneyInsert = {
          name: input.name,
          trigger_event: input.triggerEvent,
          audience_filter: (input.audienceFilter ?? {}) as Json,
          steps: input.steps as unknown as Json,
          active: true,
          proyecto_id: input.proyectoId ?? null,
          desarrolladora_id: devCtx.desarrolladoraId,
          created_by: devCtx.userId,
        };

        const { data, error } = await supabase
          .from('marketing_journeys')
          .insert(insert)
          .select('id')
          .single();
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        return { journeyId: data.id };
      },
    ),

  updateJourney: authenticatedProcedure
    .input(updateJourneyInput)
    .mutation(
      async ({ ctx, input }: { ctx: { user: { id: string } }; input: UpdateJourneyInput }) => {
        const supabase = createAdminClient();
        await requireDevContext(supabase, ctx.user.id);

        type JourneyUpdate = Database['public']['Tables']['marketing_journeys']['Update'];
        const update: JourneyUpdate = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) update.name = input.name;
        if (input.triggerEvent !== undefined) update.trigger_event = input.triggerEvent;
        if (input.audienceFilter !== undefined)
          update.audience_filter = input.audienceFilter as Json;
        if (input.steps !== undefined) update.steps = input.steps as unknown as Json;
        if (input.active !== undefined) update.active = input.active;

        const { error } = await supabase
          .from('marketing_journeys')
          .update(update)
          .eq('id', input.journeyId);
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        return { ok: true as const };
      },
    ),

  pauseJourney: authenticatedProcedure
    .input(pauseJourneyInput)
    .mutation(
      async ({ ctx, input }: { ctx: { user: { id: string } }; input: PauseJourneyInput }) => {
        const supabase = createAdminClient();
        await requireDevContext(supabase, ctx.user.id);
        const { error } = await supabase
          .from('marketing_journeys')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', input.journeyId);
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        return { ok: true as const };
      },
    ),

  getJourneyExecutions: authenticatedProcedure
    .input(getJourneyExecutionsInput)
    .query(
      async ({
        ctx,
        input,
      }: {
        ctx: { user: { id: string } };
        input: GetJourneyExecutionsInput;
      }) => {
        const supabase = createAdminClient();
        await requireDevContext(supabase, ctx.user.id);

        const { data, error } = await supabase
          .from('journey_executions')
          .select(
            'id, journey_id, lead_id, status, current_step, started_at, last_executed_at, next_run_at, completed_at, error_log',
          )
          .eq('journey_id', input.journeyId)
          .order('started_at', { ascending: false })
          .limit(input.limit);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        return data ?? [];
      },
    ),

  enrollLeadInJourney: authenticatedProcedure
    .input(enrollLeadInJourneyInput)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: { user: { id: string } };
        input: EnrollLeadInJourneyInput;
      }) => {
        const supabase = createAdminClient();
        const devCtx = await requireDevContext(supabase, ctx.user.id);
        await ensureLeadOwned(supabase, devCtx, input.leadId);

        type ExecutionInsert = Database['public']['Tables']['journey_executions']['Insert'];
        const insert: ExecutionInsert = {
          journey_id: input.journeyId,
          lead_id: input.leadId,
          status: 'pending',
          current_step: 0,
          next_run_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('journey_executions')
          .upsert(insert, { onConflict: 'journey_id,lead_id' })
          .select('id')
          .single();
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        return { executionId: data.id };
      },
    ),
});

export type CrmDevRouter = typeof crmDevRouter;
