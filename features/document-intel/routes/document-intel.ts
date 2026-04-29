// FASE 17 Document Intelligence — STUB router (extended por CC-A.1 17.B)
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Sesión 17.A: PM pre-registra stub para evitar conflicts en server/trpc/root.ts
// Sesión 17.B: CC-A.1 extiende con procedures reales (extraction + saldo IA + drive)

import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

export const documentIntelRouter = router({
  ping: authenticatedProcedure.query(() => ({
    ok: true,
    feature: 'document-intel',
    phase: 'F17',
    stub: true,
    message: 'STUB FASE 17 sesión 17.A — procedures reales en CC-A.1 sesión 17.B',
  })),
});
