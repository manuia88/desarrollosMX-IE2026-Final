// Stub router 15.C Worksheets brokers (B.1 onyx-benchmarked, FASE 15 ola 3)
// PM pre-registro para evitar conflicto multi-agent canon en server/trpc/root.ts.
// CC-A llenará procedures completos: requestWorksheet/approve/reject/list/expire.

import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

export const worksheetsRouter = router({
  // STUB — activar FASE 15 ola 3 sub-bloque 15.C
  // Procedures pendientes:
  //   - requestWorksheet (asesor solicita reserva 48h)
  //   - approveWorksheet / rejectWorksheet (dev decide 1-click)
  //   - listMyWorksheets (asesor + dev RLS-filtered)
  //   - expireWorksheet (system cron-only)
  ping: authenticatedProcedure.query(() => ({ ok: true, scope: 'worksheets-stub' })),
});
