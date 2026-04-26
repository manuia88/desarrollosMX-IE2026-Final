// FASE 07.7.A.4 — CRM tRPC router base.
// Procedures authenticated por default (RLS server-side handles authorization).
// Notes runtime: requires db push post-merge para que tablas existan.
// Database types NO incluyen aún las tablas CRM (regenerar `npm run db:types` post-push).
// Cast supabase via `cast` helper para evitar errores typecheck pre-regen.

import { TRPCError } from '@trpc/server';
import {
  buyerTwinComputeTraitsInput,
  buyerTwinCreateInput,
  buyerTwinSearchSimilarInput,
  dealAdvanceStageInput,
  dealCloseInput,
  dealCreateInput,
  dealListInput,
  familyUnitAddMemberInput,
  familyUnitCreateInput,
  leadAssignInput,
  leadCreateInput,
  leadListInput,
  leadUpdateStatusInput,
  operacionAttachCfdiInput,
  operacionCreateInput,
  operacionListInput,
  referralAttributeInput,
  referralListInput,
  referralRewardPayInput,
  retentionPoliciesListInput,
} from '@/features/crm/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { contactNotesRouter } from './notes';

// Type-erased helper porque Database types aún no incluyen tablas CRM (post db:types regen).
// Post-merge + db push + db:types se reemplaza por client tipado nativo.
type CrmSupabaseClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (
        col: string,
        value: unknown,
      ) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    select: (cols: string) => CrmSelectQuery;
  };
};

interface CrmSelectQuery {
  eq: (col: string, value: unknown) => CrmSelectQuery;
  order: (col: string, opts?: { ascending?: boolean }) => CrmSelectQuery;
  limit: (n: number) => CrmSelectQuery;
  single: () => Promise<{
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  }>;
  then: <T>(
    onfulfilled: (value: {
      data: Array<Record<string, unknown>> | null;
      error: { message: string } | null;
    }) => T,
  ) => Promise<T>;
}

function cast(client: unknown): CrmSupabaseClient {
  return client as CrmSupabaseClient;
}

function throwInternal(error: { message: string } | null): never {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error?.message ?? 'crm_query_failed',
  });
}

const leadRouter = router({
  create: authenticatedProcedure.input(leadCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('leads')
      .insert({
        zone_id: input.zone_id,
        source_id: input.source_id,
        country_code: input.country_code,
        contact_name: input.contact_name,
        contact_email: input.contact_email ?? null,
        contact_phone: input.contact_phone ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
        assigned_asesor_id: ctx.user.id,
      })
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),

  list: authenticatedProcedure.input(leadListInput).query(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (input.status) query = query.eq('status', input.status);
    if (input.country_code) query = query.eq('country_code', input.country_code);
    if (input.assigned_asesor_id) query = query.eq('assigned_asesor_id', input.assigned_asesor_id);
    query = query.limit(input.limit);
    const { data, error } = await query;
    if (error) throwInternal(error);
    return data ?? [];
  }),

  updateStatus: authenticatedProcedure
    .input(leadUpdateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const { data, error } = await supabase
        .from('leads')
        .update({ status: input.status })
        .eq('id', input.lead_id)
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),

  assign: authenticatedProcedure.input(leadAssignInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('leads')
      .update({ assigned_asesor_id: input.assigned_asesor_id })
      .eq('id', input.lead_id)
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),
});

const dealRouter = router({
  create: authenticatedProcedure.input(dealCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('deals')
      .insert({
        lead_id: input.lead_id,
        zone_id: input.zone_id,
        property_id: input.property_id ?? null,
        stage_id: input.stage_id,
        amount: input.amount,
        amount_currency: input.amount_currency,
        country_code: input.country_code,
        asesor_id: ctx.user.id,
        probability: input.probability,
        expected_close_date: input.expected_close_date ?? null,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),

  list: authenticatedProcedure.input(dealListInput).query(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    let query = supabase.from('deals').select('*').order('created_at', { ascending: false });
    if (input.country_code) query = query.eq('country_code', input.country_code);
    if (input.asesor_id) query = query.eq('asesor_id', input.asesor_id);
    query = query.limit(input.limit);
    const { data, error } = await query;
    if (error) throwInternal(error);
    return data ?? [];
  }),

  advanceStage: authenticatedProcedure
    .input(dealAdvanceStageInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const { data, error } = await supabase
        .from('deals')
        .update({ stage_id: input.stage_id })
        .eq('id', input.deal_id)
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),

  close: authenticatedProcedure.input(dealCloseInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const targetSlug = input.outcome === 'won' ? 'closed_won' : 'closed_lost';
    const { data: stage, error: stageError } = await supabase
      .from('deal_stages')
      .select('id')
      .eq('slug', targetSlug)
      .single();
    if (stageError || !stage) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'deal_stage_not_found' });
    }
    const { data, error } = await supabase
      .from('deals')
      .update({
        stage_id: (stage as { id: string }).id,
        actual_close_date: input.actual_close_date ?? new Date().toISOString().slice(0, 10),
      })
      .eq('id', input.deal_id)
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),
});

const operacionRouter = router({
  create: authenticatedProcedure.input(operacionCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('operaciones')
      .insert({
        deal_id: input.deal_id,
        operacion_type: input.operacion_type,
        amount: input.amount,
        amount_currency: input.amount_currency,
        commission_amount: input.commission_amount,
        commission_currency: input.commission_currency ?? null,
        country_code: input.country_code,
        closed_at: input.closed_at ?? new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),

  list: authenticatedProcedure.input(operacionListInput).query(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    let query = supabase.from('operaciones').select('*').order('closed_at', { ascending: false });
    if (input.fiscal_status) query = query.eq('fiscal_status', input.fiscal_status);
    if (input.country_code) query = query.eq('country_code', input.country_code);
    query = query.limit(input.limit);
    const { data, error } = await query;
    if (error) throwInternal(error);
    return data ?? [];
  }),

  attachCfdi: authenticatedProcedure
    .input(operacionAttachCfdiInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const { data, error } = await supabase
        .from('operaciones')
        .update({ cfdi_uuid: input.cfdi_uuid, fiscal_status: 'invoiced' })
        .eq('id', input.operacion_id)
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),
});

const buyerTwinRouter = router({
  create: authenticatedProcedure.input(buyerTwinCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('buyer_twins')
      .insert({
        user_id: ctx.user.id,
        persona_type_id: input.persona_type_id,
        zone_focus_ids: input.zone_focus_ids,
        price_range_min: input.price_range_min ?? null,
        price_range_max: input.price_range_max ?? null,
        price_range_currency: input.price_range_currency ?? null,
        country_code: input.country_code,
      })
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),

  computeTraits: authenticatedProcedure
    .input(buyerTwinComputeTraitsInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const updates: Record<string, unknown> = {};
      if (input.disc_profile) updates.disc_profile = input.disc_profile;
      if (input.big_five_profile) updates.big_five_profile = input.big_five_profile;
      if (Object.keys(updates).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'no_profile_provided' });
      }
      const { data, error } = await supabase
        .from('buyer_twins')
        .update(updates)
        .eq('id', input.buyer_twin_id)
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),

  searchSimilar: authenticatedProcedure.input(buyerTwinSearchSimilarInput).query(async () => {
    // STUB FASE 13.B.7 — pgvector knn requires embedding populated.
    // Real impl: SELECT id, 1 - (behavioral_embedding <=> reference) as score
    //   FROM buyer_twins WHERE id != input.buyer_twin_id AND behavioral_embedding IS NOT NULL
    //   ORDER BY behavioral_embedding <=> reference LIMIT input.limit.
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'buyer_twin_similar_stub_fase_13_b_7',
    });
  }),
});

const referralRouter = router({
  attribute: authenticatedProcedure
    .input(referralAttributeInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const { data, error } = await supabase
        .from('referrals')
        .insert({
          source_type: input.source_type,
          source_id: input.source_id,
          target_type: input.target_type,
          target_id: input.target_id,
          persona_type_id: input.persona_type_id ?? null,
          country_code: input.country_code,
          reward_amount: input.reward_amount ?? null,
          reward_currency: input.reward_currency ?? null,
          expires_at: input.expires_at ?? null,
        })
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),

  list: authenticatedProcedure.input(referralListInput).query(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    let query = supabase.from('referrals').select('*').order('created_at', { ascending: false });
    if (input.status) query = query.eq('status', input.status);
    if (input.country_code) query = query.eq('country_code', input.country_code);
    query = query.limit(input.limit);
    const { data, error } = await query;
    if (error) throwInternal(error);
    return data ?? [];
  }),

  rewardPay: authenticatedProcedure
    .input(referralRewardPayInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const { data, error } = await supabase
        .from('referral_rewards')
        .update({
          paid_at: new Date().toISOString(),
          payment_method: input.payment_method,
          payment_reference: input.payment_reference,
        })
        .eq('id', input.reward_id)
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),
});

const familyUnitRouter = router({
  create: authenticatedProcedure.input(familyUnitCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('family_units')
      .insert({
        primary_buyer_twin_id: input.primary_buyer_twin_id,
        unit_type: input.unit_type,
        members_count: input.members_count,
        combined_budget_min: input.combined_budget_min ?? null,
        combined_budget_max: input.combined_budget_max ?? null,
        combined_budget_currency: input.combined_budget_currency ?? null,
        country_code: input.country_code,
      })
      .select('*')
      .single();
    if (error) throwInternal(error);
    return data;
  }),

  addMember: authenticatedProcedure
    .input(familyUnitAddMemberInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      const { data, error } = await supabase
        .from('family_unit_members')
        .insert({
          family_unit_id: input.family_unit_id,
          buyer_twin_id: input.buyer_twin_id,
          relationship: input.relationship,
          is_primary: input.is_primary,
        })
        .select('*')
        .single();
      if (error) throwInternal(error);
      return data;
    }),

  list: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('family_units')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throwInternal(error);
    return data ?? [];
  }),
});

const catalogsRouter = router({
  personaTypes: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('persona_types')
      .select('*')
      .eq('active', true)
      .order('slug');
    if (error) throwInternal(error);
    return data ?? [];
  }),
  leadSources: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('active', true)
      .order('slug');
    if (error) throwInternal(error);
    return data ?? [];
  }),
  dealStages: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase.from('deal_stages').select('*').order('order_index');
    if (error) throwInternal(error);
    return data ?? [];
  }),
  retentionPolicies: authenticatedProcedure
    .input(retentionPoliciesListInput)
    .query(async ({ ctx, input }) => {
      const supabase = cast(ctx.supabase);
      let query = supabase
        .from('retention_policies')
        .select('*')
        .eq('active', true)
        .order('country_code')
        .order('entity_type');
      if (input.country_code) query = query.eq('country_code', input.country_code);
      if (input.entity_type) query = query.eq('entity_type', input.entity_type);
      const { data, error } = await query;
      if (error) throwInternal(error);
      return data ?? [];
    }),
});

export const crmRouter = router({
  lead: leadRouter,
  deal: dealRouter,
  operacion: operacionRouter,
  buyerTwin: buyerTwinRouter,
  referral: referralRouter,
  familyUnit: familyUnitRouter,
  catalogs: catalogsRouter,
  notes: contactNotesRouter,
});

export type CrmRouter = typeof crmRouter;
