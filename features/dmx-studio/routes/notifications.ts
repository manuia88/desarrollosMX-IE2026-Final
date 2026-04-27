// F14.F.5 Sprint 4 — DMX Studio notifications preferences (Tarea 4.5).
// Owned por sub-agent 4. Procedures: getPreferences + updatePreferences + getHistory.
// Implementacion completa en sub-agent 4 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioNotificationsRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
