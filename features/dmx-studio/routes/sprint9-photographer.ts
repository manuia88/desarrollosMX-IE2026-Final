// F14.F.10 Sprint 9 BIBLIA — Plan Fotógrafo B2B2C router.
// Foto-plan-only canon ($67) salvo public/portfolio/marketplace procedures.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';
import { studioPhotographerProcedure } from './_photographer-procedure';

const photographerProfileInput = z.object({
  businessName: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email(),
  website: z.string().url().optional(),
  specialityZones: z.array(z.string()).max(20).default([]),
  yearsExperience: z.number().int().min(0).max(60).optional(),
});

const setSlugInput = z.object({
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug debe ser kebab-case'),
});

const setMarkupInput = z.object({
  markupPct: z.number().min(0).max(1000),
});

const toggleWhiteLabelInput = z.object({
  enabled: z.boolean(),
  customFooter: z.string().max(200).optional(),
});

const togglePortfolioVisibleInput = z.object({
  visible: z.boolean(),
});

const inviteClientInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  videoId: z.string().uuid().optional(),
  invitationType: z.enum(['client_invite', 'referral_program']).default('client_invite'),
});

const acceptInvitationInput = z.object({
  token: z.string().min(10),
});

const portfolioSlugInput = z.object({
  slug: z.string().min(1).max(60),
});

const directoryFilterInput = z.object({
  zone: z.string().optional(),
  speciality: z.string().optional(),
  minRating: z.number().min(0).max(5).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const previewPricingInput = z.object({
  photographerId: z.string().uuid(),
  videosPerMonth: z.number().int().min(1).max(200),
});

export const studioSprint9PhotographerRouter = router({
  // === Profile ===
  getProfile: studioPhotographerProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_photographers')
      .select('*')
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  upsertProfile: studioPhotographerProcedure
    .input(photographerProfileInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: existing } = await supabase
        .from('studio_photographers')
        .select('id, slug')
        .eq('user_id', ctx.user.id)
        .maybeSingle();

      const slug = existing?.slug ?? generateSlugFromBusiness(input.businessName);

      const payload = {
        user_id: ctx.user.id,
        business_name: input.businessName,
        slug,
        bio: input.bio ?? null,
        phone: input.phone ?? null,
        email: input.email,
        website: input.website ?? null,
        speciality_zones: input.specialityZones,
        years_experience: input.yearsExperience ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('studio_photographers')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data;
    }),

  setSlug: studioPhotographerProcedure.input(setSlugInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: existingSlug } = await supabase
      .from('studio_photographers')
      .select('user_id')
      .eq('slug', input.slug)
      .neq('user_id', ctx.user.id)
      .maybeSingle();

    if (existingSlug) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Slug ya en uso' });
    }

    const { data, error } = await supabase
      .from('studio_photographers')
      .update({ slug: input.slug, updated_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .select()
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  setMarkup: studioPhotographerProcedure.input(setMarkupInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_photographers')
      .update({ markup_pct: input.markupPct, updated_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .select()
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  toggleWhiteLabel: studioPhotographerProcedure
    .input(toggleWhiteLabelInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_photographers')
        .update({
          white_label_enabled: input.enabled,
          white_label_custom_footer: input.customFooter ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', ctx.user.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data;
    }),

  togglePortfolioVisible: studioPhotographerProcedure
    .input(togglePortfolioVisibleInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_photographers')
        .update({ portfolio_visible: input.visible, updated_at: new Date().toISOString() })
        .eq('user_id', ctx.user.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data;
    }),

  // === Clients ===
  listClients: studioPhotographerProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: photographer } = await supabase
        .from('studio_photographers')
        .select('id')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!photographer) return [];

      let q = supabase
        .from('studio_photographer_clients')
        .select('*')
        .eq('photographer_id', photographer.id)
        .order('created_at', { ascending: false });

      if (input?.status) q = q.eq('relation_status', input.status);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),

  // === Invites ===
  sendInvite: studioPhotographerProcedure
    .input(inviteClientInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: photographer } = await supabase
        .from('studio_photographers')
        .select('id')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!photographer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photographer profile not found' });
      }

      const referralToken = generateReferralToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('studio_photographer_invites')
        .insert({
          photographer_id: photographer.id,
          invited_email: input.email,
          invited_name: input.name ?? null,
          invitation_type: input.invitationType,
          related_video_id: input.videoId ?? null,
          referral_token: referralToken,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data;
    }),

  listInvites: studioPhotographerProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data: photographer } = await supabase
      .from('studio_photographers')
      .select('id')
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!photographer) return [];

    const { data, error } = await supabase
      .from('studio_photographer_invites')
      .select('*')
      .eq('photographer_id', photographer.id)
      .order('sent_at', { ascending: false });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  acceptInvitationPublic: publicProcedure
    .input(acceptInvitationInput)
    .mutation(async ({ input }) => {
      const supabase = createAdminClient();
      const { data: invite, error } = await supabase
        .from('studio_photographer_invites')
        .select('*')
        .eq('referral_token', input.token)
        .maybeSingle();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });

      if (new Date(invite.expires_at) < new Date()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Invitation expired' });
      }

      await supabase
        .from('studio_photographer_invites')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          opened_at: invite.opened_at ?? new Date().toISOString(),
        })
        .eq('id', invite.id);

      return {
        photographerId: invite.photographer_id,
        videoId: invite.related_video_id,
        invitationType: invite.invitation_type,
      };
    }),

  // === Portfolio público ===
  getPortfolioBySlug: publicProcedure.input(portfolioSlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_photographers')
      .select(
        'id, business_name, slug, bio, phone, email, website, speciality_zones, years_experience, rating_avg, clients_count, videos_generated_total, white_label_enabled, white_label_custom_footer',
      )
      .eq('slug', input.slug)
      .eq('portfolio_visible', true)
      .maybeSingle();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Portfolio not found' });
    return data;
  }),

  listPortfolioVideos: publicProcedure
    .input(
      z.object({
        photographerId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(12),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data: photographer } = await supabase
        .from('studio_photographers')
        .select('user_id')
        .eq('id', input.photographerId)
        .maybeSingle();
      if (!photographer) return [];

      const { data, error } = await supabase
        .from('studio_video_outputs')
        .select('id, storage_url, thumbnail_url, project_id, created_at, render_status')
        .eq('user_id', photographer.user_id)
        .eq('render_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),

  // === Directory marketplace ===
  listDirectoryPublic: publicProcedure
    .input(directoryFilterInput.optional())
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_photographer_directory')
        .select(
          'id, photographer_id, listing_priority, tags, verified_at, studio_photographers!inner(business_name, slug, bio, rating_avg, speciality_zones, clients_count)',
        )
        .eq('listing_status', 'verified')
        .order('listing_priority', { ascending: false })
        .limit(input?.limit ?? 20);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),

  applyToDirectory: studioPhotographerProcedure
    .input(z.object({ tags: z.array(z.string()).max(10).default([]) }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: photographer } = await supabase
        .from('studio_photographers')
        .select('id')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!photographer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photographer profile not found' });
      }

      const { data, error } = await supabase
        .from('studio_photographer_directory')
        .upsert(
          {
            photographer_id: photographer.id,
            listing_status: 'pending' as const,
            tags: input.tags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'photographer_id' },
        )
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data;
    }),

  getMyListing: studioPhotographerProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data: photographer } = await supabase
      .from('studio_photographers')
      .select('id')
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!photographer) return null;

    const { data, error } = await supabase
      .from('studio_photographer_directory')
      .select('*')
      .eq('photographer_id', photographer.id)
      .maybeSingle();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  // === Pricing calculator (público) ===
  previewPricing: publicProcedure.input(previewPricingInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: photographer } = await supabase
      .from('studio_photographers')
      .select('markup_pct')
      .eq('id', input.photographerId)
      .maybeSingle();

    const markup = Number(photographer?.markup_pct ?? 0);
    const baseUsd = 67; // Foto plan base
    const includedVideos = 50;
    const extraVideos = Math.max(0, input.videosPerMonth - includedVideos);
    const studioCost = baseUsd + extraVideos * 1.5;
    const totalClient = studioCost * (1 + markup / 100);

    return {
      studioCostUsd: Number(studioCost.toFixed(2)),
      markupPct: markup,
      totalClientUsd: Number(totalClient.toFixed(2)),
      breakdown: {
        baseFotoPlan: baseUsd,
        extraVideosUsd: Number((extraVideos * 1.5).toFixed(2)),
        markupAmountUsd: Number(((studioCost * markup) / 100).toFixed(2)),
      },
    };
  }),

  // === Commission ===
  getEarnings: studioPhotographerProcedure
    .input(z.object({ rangeStart: z.string(), rangeEnd: z.string() }).optional())
    .query(async ({ ctx }) => {
      const supabase = createAdminClient();
      const { data: photographer } = await supabase
        .from('studio_photographers')
        .select('id, revenue_est_total')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!photographer) return { totalRevenueUsd: 0, commissionsUsd: 0, breakdown: [] };

      const { data: invites } = await supabase
        .from('studio_photographer_invites')
        .select('commission_earned_usd, accepted_at')
        .eq('photographer_id', photographer.id)
        .eq('invitation_type', 'referral_program')
        .eq('subscribed_to_pro', true);

      const commissionsUsd = (invites ?? []).reduce(
        (sum, i) => sum + Number(i.commission_earned_usd ?? 0),
        0,
      );

      return {
        totalRevenueUsd: Number(photographer.revenue_est_total),
        commissionsUsd,
        breakdown: invites ?? [],
      };
    }),

  // === Bulk processing ===
  createBulkBatch: studioPhotographerProcedure
    .input(
      z.object({
        projectIds: z.array(z.string().uuid()).min(2).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: photographer } = await supabase
        .from('studio_photographers')
        .select('id')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!photographer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photographer profile not found' });
      }

      const batchId = crypto.randomUUID();
      const photographerId = photographer.id;
      const { data, error } = await supabase
        .from('studio_api_jobs')
        .insert(
          input.projectIds.map((projectId) => ({
            user_id: ctx.user.id,
            project_id: projectId,
            job_type: 'photographer_bulk',
            provider: 'kling',
            status: 'queued',
            input_payload: { batchId, photographerId } as unknown as Json,
          })),
        )
        .select('id, input_payload, status');

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { batchId, jobs: data ?? [] };
    }),

  getBatchStatus: studioPhotographerProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_api_jobs')
        .select('id, status, input_payload, created_at, completed_at')
        .eq('user_id', ctx.user.id)
        .eq('job_type', 'photographer_bulk')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      const filtered = (data ?? []).filter((row) => {
        const payload = (row.input_payload as Record<string, unknown> | null) ?? {};
        return payload.batchId === input.batchId;
      });

      const counts = filtered.reduce(
        (acc, j) => {
          acc[j.status] = (acc[j.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return { batchId: input.batchId, jobs: filtered, counts };
    }),

  // === Reseller terms ===
  acceptResellerTerms: studioPhotographerProcedure.mutation(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_photographers')
      .update({ reseller_terms_accepted_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .select()
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),
});

function generateSlugFromBusiness(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

function generateReferralToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  ).slice(0, 32);
}
