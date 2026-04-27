// F14.F.5 Sprint 4 — DMX Studio notifications preferences (Tarea 4.5).
// Procedures: getPreferences, updatePreferences, getHistory.
// Preferences are persisted under studio_users_extension.meta.notifications_prefs (jsonb).
// History is a STUB ADR-018 — full audit log defered to H2 (L-NEW-NOTIFICATIONS-HISTORY-LOG).

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

export const NotificationsPrefsSchema = z.object({
  emailDailyContentReady: z.boolean(),
  emailNewRemarketing: z.boolean(),
  emailStreakMilestone: z.boolean(),
  emailChallengeWeek: z.boolean(),
  emailDripCampaign: z.boolean(),
});
export type NotificationsPrefs = z.infer<typeof NotificationsPrefsSchema>;

const DEFAULT_PREFS: NotificationsPrefs = {
  emailDailyContentReady: true,
  emailNewRemarketing: true,
  emailStreakMilestone: true,
  emailChallengeWeek: true,
  emailDripCampaign: true,
};

function parsePrefs(raw: unknown): NotificationsPrefs {
  if (raw === null || typeof raw !== 'object') return DEFAULT_PREFS;
  const parsed = NotificationsPrefsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Partial / legacy meta: merge with defaults so missing keys default to true.
  const obj = raw as Record<string, unknown>;
  return {
    emailDailyContentReady:
      typeof obj.emailDailyContentReady === 'boolean'
        ? obj.emailDailyContentReady
        : DEFAULT_PREFS.emailDailyContentReady,
    emailNewRemarketing:
      typeof obj.emailNewRemarketing === 'boolean'
        ? obj.emailNewRemarketing
        : DEFAULT_PREFS.emailNewRemarketing,
    emailStreakMilestone:
      typeof obj.emailStreakMilestone === 'boolean'
        ? obj.emailStreakMilestone
        : DEFAULT_PREFS.emailStreakMilestone,
    emailChallengeWeek:
      typeof obj.emailChallengeWeek === 'boolean'
        ? obj.emailChallengeWeek
        : DEFAULT_PREFS.emailChallengeWeek,
    emailDripCampaign:
      typeof obj.emailDripCampaign === 'boolean'
        ? obj.emailDripCampaign
        : DEFAULT_PREFS.emailDripCampaign,
  };
}

export const studioNotificationsRouter = router({
  getPreferences: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_users_extension')
      .select('meta')
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    const meta = (data?.meta ?? {}) as Record<string, unknown>;
    const prefsRaw =
      meta && typeof meta === 'object' && 'notifications_prefs' in meta
        ? meta.notifications_prefs
        : null;
    return parsePrefs(prefsRaw);
  }),

  updatePreferences: studioProcedure
    .input(NotificationsPrefsSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_users_extension')
        .select('meta')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      const currentMeta = (data?.meta ?? {}) as Record<string, unknown>;
      const nextMeta = { ...currentMeta, notifications_prefs: input };
      const { error: updError } = await supabase
        .from('studio_users_extension')
        .update({ meta: nextMeta })
        .eq('user_id', ctx.user.id);
      if (updError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updError });
      return { ok: true as const, prefs: input };
    }),

  // STUB ADR-018 — activar L-NEW-NOTIFICATIONS-HISTORY-LOG (H2).
  // Heuristica detectada: returns isPlaceholder + empty list. Full audit log
  // requires nueva tabla studio_notifications_log + ingest hooks per send.
  getHistory: studioProcedure.query(() => {
    return {
      items: [] as ReadonlyArray<never>,
      isPlaceholder: true,
      stub: 'studio-notifications-history',
      message:
        'STUB-NOT-ACTIVE — notifications history log defered to L-NEW-NOTIFICATIONS-HISTORY-LOG (H2)',
    } as const;
  }),
});
