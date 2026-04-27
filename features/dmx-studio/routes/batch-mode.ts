// F14.F.5 Sprint 4 — DMX Studio batch mode A/B 3 estilos (Agency only).
// Owned por sub-agent 3. Procedures: createBatch + getBatchProjects.
// Implementacion completa en sub-agent 3 task.

import { router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

export const studioBatchModeRouter = router({
  ping: studioProcedure.query(() => ({ ok: true as const })),
});
