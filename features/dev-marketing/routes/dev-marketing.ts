// Stub router 15.D.2 M14 Marketing Dev (FASE 15 ola 2)
// PM pre-registro para evitar conflicto multi-agent canon en server/trpc/root.ts.
// CC-A llenará procedures completos: campaigns CRUD + B.4 attribution + CF.2 Studio video.

import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

export const devMarketingRouter = router({
  // STUB — activar FASE 15 ola 2 ventana 15.D.2
  // Procedures pendientes:
  //   - listCampaigns / createCampaign / updateCampaign / pauseCampaign
  //   - getCampaignAnalytics / getAttributionReport / getOptimizerRecommendations
  //   - applyOptimizerAction (B.4 Claude IA pause)
  //   - requestStudioVideoJob (CF.2 cross-feature Studio routes shipped)
  //   - listLandings / autoGenerateLanding (reusa marketing router shipped)
  ping: authenticatedProcedure.query(() => ({ ok: true, scope: 'dev-marketing-stub' })),
});
