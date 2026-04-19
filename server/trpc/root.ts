import { meRouter } from '@/features/auth/routes/me';
import { mfaRouter } from '@/features/auth/routes/mfa';
import { roleRequestRouter } from '@/features/auth/routes/role-request';
import { fxRouter } from '@/features/fx/routes/fx';
import { aiRouter } from '@/features/ia-generativa/routes/ai';
import { memoryRouter } from '@/features/ia-generativa/routes/memory';
import { marketRouter } from '@/features/market/routes/market';
import { scianRouter } from '@/features/scian/routes/scian';
import { strBreakevenRouter } from '@/features/str-intelligence/routes/breakeven';
import { strHostsRouter } from '@/features/str-intelligence/routes/hosts';
import { ltrStrConnectionRouter } from '@/features/str-intelligence/routes/ltr-connection';
import { strScoresRouter } from '@/features/str-intelligence/routes/scores';
import { strViabilityRouter } from '@/features/str-intelligence/routes/viability';
import { zoneInvestmentRouter } from '@/features/str-intelligence/routes/zone-investment';
import { publicProcedure, router } from './init';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    timestamp: Date.now(),
  })),
  ai: aiRouter,
  fx: fxRouter,
  market: marketRouter,
  me: meRouter,
  memory: memoryRouter,
  mfa: mfaRouter,
  roleRequest: roleRequestRouter,
  scian: scianRouter,
  ltrStrConnection: ltrStrConnectionRouter,
  strBreakeven: strBreakevenRouter,
  strHosts: strHostsRouter,
  strScores: strScoresRouter,
  strViability: strViabilityRouter,
  zoneInvestment: zoneInvestmentRouter,
});

export type AppRouter = typeof appRouter;
