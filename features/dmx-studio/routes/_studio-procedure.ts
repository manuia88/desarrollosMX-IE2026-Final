import { TRPCError } from '@trpc/server';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const STUDIO_ROLES: ReadonlySet<string> = new Set([
  'studio_user',
  'studio_admin',
  'studio_photographer',
]);

export interface StudioContext {
  readonly studioRole: 'studio_user' | 'studio_admin' | 'studio_photographer';
  readonly organizationId: string | null;
  readonly onboardingCompleted: boolean;
}

export const studioProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_users_extension')
    .select('studio_role, organization_id, onboarding_completed')
    .eq('user_id', ctx.user.id)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }
  if (!data) {
    const { error: insertError } = await supabase.from('studio_users_extension').insert({
      user_id: ctx.user.id,
      studio_role: 'studio_user',
      onboarding_completed: false,
    });
    if (insertError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertError });
    }
    return next({
      ctx: {
        ...ctx,
        studio: {
          studioRole: 'studio_user' as const,
          organizationId: null,
          onboardingCompleted: false,
        } satisfies StudioContext,
      },
    });
  }
  if (!STUDIO_ROLES.has(data.studio_role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      ...ctx,
      studio: {
        studioRole: data.studio_role as StudioContext['studioRole'],
        organizationId: data.organization_id ?? null,
        onboardingCompleted: data.onboarding_completed,
      } satisfies StudioContext,
    },
  });
});
