// F14.F.5 Sprint 4 UPGRADE 8 LATERAL — DMX Studio AI coach diario.
// Owned por sub-agent 5. Procedures: getSessionToday + recordResponse + dismissSession.
// Implementacion completa en sub-agent 5 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioAiCoachRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
