// F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streaks gamification.
// Owned por sub-agent 4. Procedures: getCurrent + getLongest + getBadges.
// Implementacion completa en sub-agent 4 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioStreaksRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
