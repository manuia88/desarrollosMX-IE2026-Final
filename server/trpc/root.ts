import { atlasRouter } from '@/features/atlas/routes/atlas';
import { meRouter } from '@/features/auth/routes/me';
import { mfaRouter } from '@/features/auth/routes/mfa';
import { roleRequestRouter } from '@/features/auth/routes/role-request';
import { busquedasRouter } from '@/features/busquedas/routes/busquedas';
import { captacionesRouter } from '@/features/captaciones/routes/captaciones';
import { constellationsRouter } from '@/features/constellations/routes/constellations';
import { crmRouter } from '@/features/crm/routes/crm';
import { crmDevRouter } from '@/features/crm-dev/routes/crm-dev';
import { desarrollosRouter } from '@/features/desarrollos/routes/desarrollos';
import { developerRouter } from '@/features/developer/routes/developer';
import { studioRouter } from '@/features/dmx-studio/routes/studio';
import { estadisticasRouter } from '@/features/estadisticas/routes/estadisticas';
import { fxRouter } from '@/features/fx/routes/fx';
import { ghostZonesRouter } from '@/features/ghost-zones/routes/ghost-zones';
import { aiRouter } from '@/features/ia-generativa/routes/ai';
import { memoryRouter } from '@/features/ia-generativa/routes/memory';
import { ieScoresRouter } from '@/features/ie/routes/scores';
import { indicesPublicRouter } from '@/features/indices-publicos/routes/indices-public';
import { lifepathRouter } from '@/features/lifepath/routes/lifepath';
import { marketRouter } from '@/features/market/routes/market';
import { marketingRouter } from '@/features/marketing/routes/marketing';
import { newsletterPublicRouter } from '@/features/newsletter/routes/newsletter-public';
import { operacionesRouter } from '@/features/operaciones/routes/operaciones';
import { scianRouter } from '@/features/scian/routes/scian';
import { strBreakevenRouter } from '@/features/str-intelligence/routes/breakeven';
import { envRouter } from '@/features/str-intelligence/routes/env';
import { hostMigrationsRouter } from '@/features/str-intelligence/routes/host-migrations';
import { strHostsRouter } from '@/features/str-intelligence/routes/hosts';
import { invisibleHotelsRouter } from '@/features/str-intelligence/routes/invisible-hotels';
import { ltrStrConnectionRouter } from '@/features/str-intelligence/routes/ltr-connection';
import { nomadRouter } from '@/features/str-intelligence/routes/nomad';
import { photoCvRouter } from '@/features/str-intelligence/routes/photo-cv';
import { strPortfolioRouter } from '@/features/str-intelligence/routes/portfolio';
import { strPricingRouter } from '@/features/str-intelligence/routes/pricing';
import { strReportsRouter } from '@/features/str-intelligence/routes/reports';
import { strScoresRouter } from '@/features/str-intelligence/routes/scores';
import { strViabilityRouter } from '@/features/str-intelligence/routes/viability';
import { strWatchdogRouter } from '@/features/str-intelligence/routes/watchdog';
import { zoneInvestmentRouter } from '@/features/str-intelligence/routes/zone-investment';
import { tareasRouter } from '@/features/tareas/routes/tareas';
import { publicProcedure, router } from './init';
import { causalRouter } from './routers/causal';
import { migrationFlowRouter } from './routers/migration-flow';
import { pulseRouter } from './routers/pulse';
import { trendGenomeRouter } from './routers/trend-genome';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    timestamp: Date.now(),
  })),
  ai: aiRouter,
  atlas: atlasRouter,
  busquedas: busquedasRouter,
  captaciones: captacionesRouter,
  causal: causalRouter,
  constellations: constellationsRouter,
  crm: crmRouter,
  crmDev: crmDevRouter,
  desarrollos: desarrollosRouter,
  developer: developerRouter,
  estadisticas: estadisticasRouter,
  fx: fxRouter,
  ghostZones: ghostZonesRouter,
  market: marketRouter,
  me: meRouter,
  memory: memoryRouter,
  mfa: mfaRouter,
  migrationFlow: migrationFlowRouter,
  newsletter: newsletterPublicRouter,
  operaciones: operacionesRouter,
  roleRequest: roleRequestRouter,
  scian: scianRouter,
  ltrStrConnection: ltrStrConnectionRouter,
  strBreakeven: strBreakevenRouter,
  hostMigrations: hostMigrationsRouter,
  strHosts: strHostsRouter,
  env: envRouter,
  ieScores: ieScoresRouter,
  indicesPublic: indicesPublicRouter,
  lifepath: lifepathRouter,
  marketing: marketingRouter,
  invisibleHotels: invisibleHotelsRouter,
  nomad: nomadRouter,
  photoCv: photoCvRouter,
  pulse: pulseRouter,
  strPortfolio: strPortfolioRouter,
  strPricing: strPricingRouter,
  strReports: strReportsRouter,
  strWatchdog: strWatchdogRouter,
  strScores: strScoresRouter,
  strViability: strViabilityRouter,
  studio: studioRouter,
  tareas: tareasRouter,
  trendGenome: trendGenomeRouter,
  zoneInvestment: zoneInvestmentRouter,
});

export type AppRouter = typeof appRouter;
