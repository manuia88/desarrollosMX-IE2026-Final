import { meRouter } from '@/features/auth/routes/me';
import { mfaRouter } from '@/features/auth/routes/mfa';
import { roleRequestRouter } from '@/features/auth/routes/role-request';
import { memoryRouter } from '@/features/ia-generativa/routes/memory';
import { publicProcedure, router } from './init';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    timestamp: Date.now(),
  })),
  me: meRouter,
  memory: memoryRouter,
  mfa: mfaRouter,
  roleRequest: roleRequestRouter,
});

export type AppRouter = typeof appRouter;
