import { mfaRouter } from '@/features/auth/routes/mfa';
import { publicProcedure, router } from './init';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    timestamp: Date.now(),
  })),
  mfa: mfaRouter,
});

export type AppRouter = typeof appRouter;
