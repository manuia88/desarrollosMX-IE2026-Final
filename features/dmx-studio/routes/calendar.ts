// F14.F.5 Sprint 4 — DMX Studio calendar IA + AI mood + smart timing.
// Owned por sub-agent 1. Procedures: getMonth + generateMonth + getDaySuggestion +
// markAsGenerated + exportICal. Implementacion completa en sub-agent 1 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioCalendarRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
