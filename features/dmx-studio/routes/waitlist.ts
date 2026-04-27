// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Waitlist tRPC procedures: join (public), getCount (public),
// getPriorityPreview (authenticated).

import { TRPCError } from '@trpc/server';
import { joinWaitlist } from '@/features/dmx-studio/lib/waitlist';
import { FOUNDERS_COHORT_LIMIT } from '@/features/dmx-studio/lib/waitlist/founders-cohort';
import {
  calculatePriorityScore,
  type StudioWaitlistRole,
} from '@/features/dmx-studio/lib/waitlist/priority-scoring';
import { joinStudioWaitlistInput } from '@/features/dmx-studio/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ASESOR_PROFILE_ROLES: ReadonlySet<string> = new Set(['asesor', 'broker_manager']);

export const studioWaitlistRouter = router({
  join: publicProcedure.input(joinStudioWaitlistInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const currentUserId = ctx.user?.id ?? null;

    let currentLeadsCount: number | null = null;
    let currentClosedDealsCount: number | null = null;

    if (currentUserId) {
      const [leadsRes, opsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_asesor_id', currentUserId),
        supabase
          .from('operaciones')
          .select('id', { count: 'exact', head: true })
          .eq('asesor_id', currentUserId)
          .eq('status', 'closed'),
      ]);
      if (leadsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: leadsRes.error });
      }
      if (opsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: opsRes.error });
      }
      currentLeadsCount = leadsRes.count ?? 0;
      currentClosedDealsCount = opsRes.count ?? 0;
    }

    try {
      const result = await joinWaitlist(supabase, {
        email: input.email,
        name: input.name,
        phone: input.phone,
        role: input.role,
        city: input.city,
        countryCode: input.countryCode,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        currentUserId,
        currentLeadsCount,
        currentClosedDealsCount,
        source: 'studio_landing',
      });
      return {
        id: result.id,
        foundersCohortEligible: result.foundersCohortEligible,
        foundersCohortPosition: result.foundersCohortPosition,
        alreadyExisted: result.alreadyExisted,
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'waitlist join failed',
      });
    }
  }),

  getCount: publicProcedure.query(async () => {
    const supabase = createAdminClient();
    const [totalRes, foundersUsedRes] = await Promise.all([
      supabase.from('studio_waitlist').select('id', { count: 'exact', head: true }),
      supabase
        .from('studio_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('founders_cohort_eligible', true),
    ]);
    if (totalRes.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: totalRes.error });
    }
    if (foundersUsedRes.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: foundersUsedRes.error });
    }
    const total = totalRes.count ?? 0;
    const foundersUsed = foundersUsedRes.count ?? 0;
    return {
      total,
      foundersUsed,
      foundersRemaining: Math.max(FOUNDERS_COHORT_LIMIT - foundersUsed, 0),
    };
  }),

  getPriorityPreview: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const profileRol = ctx.profile?.rol ?? 'comprador';
    const isExistingAsesor = ASESOR_PROFILE_ROLES.has(profileRol);
    const role: StudioWaitlistRole = mapProfileRolToWaitlistRole(profileRol);

    let currentLeadsCount = 0;
    let currentClosedDealsCount = 0;

    if (isExistingAsesor) {
      const [leadsRes, opsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_asesor_id', ctx.user.id),
        supabase
          .from('operaciones')
          .select('id', { count: 'exact', head: true })
          .eq('asesor_id', ctx.user.id)
          .eq('status', 'closed'),
      ]);
      if (leadsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: leadsRes.error });
      }
      if (opsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: opsRes.error });
      }
      currentLeadsCount = leadsRes.count ?? 0;
      currentClosedDealsCount = opsRes.count ?? 0;
    }

    const score = calculatePriorityScore({
      role,
      currentLeadsCount,
      currentClosedDealsCount,
      isExistingUser: true,
    });

    return {
      score,
      isExistingUser: true,
      role,
      currentLeadsCount,
      currentClosedDealsCount,
    };
  }),
});

function mapProfileRolToWaitlistRole(profileRol: string): StudioWaitlistRole {
  switch (profileRol) {
    case 'asesor':
    case 'broker_manager':
      return 'asesor';
    case 'admin_desarrolladora':
      return 'admin_desarrolladora';
    case 'studio_photographer':
      return 'photographer';
    default:
      return 'other';
  }
}
