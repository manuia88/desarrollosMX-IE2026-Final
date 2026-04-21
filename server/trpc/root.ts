import { meRouter } from '@/features/auth/routes/me';
import { mfaRouter } from '@/features/auth/routes/mfa';
import { roleRequestRouter } from '@/features/auth/routes/role-request';
import { fxRouter } from '@/features/fx/routes/fx';
import { aiRouter } from '@/features/ia-generativa/routes/ai';
import { memoryRouter } from '@/features/ia-generativa/routes/memory';
import { ieScoresRouter } from '@/features/ie/routes/scores';
import { indicesPublicRouter } from '@/features/indices-publicos/routes/indices-public';
import { marketRouter } from '@/features/market/routes/market';
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
  causal: causalRouter,
  fx: fxRouter,
  market: marketRouter,
  me: meRouter,
  memory: memoryRouter,
  mfa: mfaRouter,
  migrationFlow: migrationFlowRouter,
  roleRequest: roleRequestRouter,
  scian: scianRouter,
  ltrStrConnection: ltrStrConnectionRouter,
  strBreakeven: strBreakevenRouter,
  hostMigrations: hostMigrationsRouter,
  strHosts: strHostsRouter,
  env: envRouter,
  ieScores: ieScoresRouter,
  indicesPublic: indicesPublicRouter,
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
  trendGenome: trendGenomeRouter,
  zoneInvestment: zoneInvestmentRouter,
});

export type AppRouter = typeof appRouter;
