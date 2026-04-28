// F14.F.10 Sprint 9 — Photographer-plan-only procedure middleware (BIBLIA v4 §9).
// Plan check Foto canon ($67): features Sprint 9 (Sin branding + White-label + Bulk + Clients + Portfolio).

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

const FOTO_PLAN_KEY = 'foto' as const;

export const studioPhotographerProcedure = studioProcedure.use(async ({ ctx, next }) => {
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
  if (!data || data.plan_key !== FOTO_PLAN_KEY) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Esta función requiere plan DMX Studio Foto. Upgrade tu plan para acceder.',
    });
  }
  return next({ ctx });
});
