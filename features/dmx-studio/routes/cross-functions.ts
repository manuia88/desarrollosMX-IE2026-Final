// FASE 14.F.4 Sprint 3 — Cross-functions tRPC procedures (UPGRADES 8-10 LATERAL).
// importFromCaptacion: M05 captación → Studio project draft pre-fill.
// findMatchingBusquedas: Studio project published → M04 busquedas active matches.
//
// Trust score boost lib expone calculateStudioCopyPackBonus() pero no se exporta
// como procedure tRPC en Sprint 3 (consumido por cron H2, no UI). Activar exposición
// en L-NEW-STUDIO-TRUST-BOOST cuando dev portal lo necesite.

import { TRPCError } from '@trpc/server';
import { importFromCaptacion } from '@/features/dmx-studio/lib/cross-functions/import-from-captacion';
import { findMatchingBusquedas } from '@/features/dmx-studio/lib/cross-functions/match-busquedas';
import {
  findMatchingBusquedasInput,
  importFromCaptacionInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioCrossFunctionsRouter = router({
  importFromCaptacion: studioProcedure
    .input(importFromCaptacionInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      try {
        const result = await importFromCaptacion(supabase, input.captacionId, ctx.user.id);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        if (message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        if (message.includes('not owned')) {
          throw new TRPCError({ code: 'FORBIDDEN', message });
        }
        sentry.captureException(error, {
          tags: { feature: 'studio-cross-functions-import-captacion' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      }
    }),

  findMatchingBusquedas: studioProcedure
    .input(findMatchingBusquedasInput)
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      try {
        const result = await findMatchingBusquedas(supabase, input.projectId);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        if (message.includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        sentry.captureException(error, {
          tags: { feature: 'studio-cross-functions-match-busquedas' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      }
    }),
});
