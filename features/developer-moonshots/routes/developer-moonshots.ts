// Stub router 15.X Moonshots (FASE 15 ola 4)
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

export const developerMoonshotsRouter = router({
  // STUB — activar FASE 15 ola 4 ventana 15.X
  // Procedures pendientes:
  //   - simulateProject (15.X.1 wizard 4 steps)
  //   - listSimulatorRuns
  //   - subscribeRadarTrendGenome (15.X.2)
  //   - generateCommitteeReport (15.X.3 PDF 15-20pag)
  //   - getPipelineTracker (15.X.4 dev vs market)
  //   - generateApiKey (15.X.5 Enterprise REST)
  ping: authenticatedProcedure.query(() => ({ ok: true, scope: 'developer-moonshots-stub' })),
});
