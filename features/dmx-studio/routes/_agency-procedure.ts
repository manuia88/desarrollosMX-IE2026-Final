// F14.F.7 Sprint 6 — Agency-plan-only procedure middleware (BIBLIA v4 §6).
// Plan check Agency canon: features Sprint 6 (Seedance + Virtual Staging + Drone + Cinema Mode).

import { TRPCError } from '@trpc/server';
import { AGENCY_PLAN_KEY } from '@/features/dmx-studio/lib/feature-flags';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

export const studioAgencyProcedure = studioProcedure.use(async ({ ctx, next }) => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_subscriptions')
    .select('plan_key, status')
    .eq('user_id', ctx.user.id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!data || data.plan_key !== AGENCY_PLAN_KEY) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Esta función requiere plan DMX Agency. Upgrade tu plan para acceder.',
    });
  }
  return next({ ctx });
});
