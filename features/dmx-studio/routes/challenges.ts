// F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio community challenges (Strava Segments).
// Owned por sub-agent 5. Procedures: getCurrentWeek + participate + getLeaderboard.
// Implementacion completa en sub-agent 5 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioChallengesRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
