// F14.F.5 Sprint 4 — DMX Studio remarketing automatico procedures.
// Owned por sub-agent 2. Procedures: getActiveJobs + forceTrigger + cancel + getStatus.
// Implementacion completa en sub-agent 2 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioRemarketingRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
