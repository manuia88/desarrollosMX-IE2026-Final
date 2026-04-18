import { mfaRouter } from '@/features/auth/routes/mfa';
import { roleRequestRouter } from '@/features/auth/routes/role-request';
import { publicProcedure, router } from './init';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    timestamp: Date.now(),
  })),
  mfa: mfaRouter,
  roleRequest: roleRequestRouter,
});

export type AppRouter = typeof appRouter;
