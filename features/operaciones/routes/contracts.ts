// Stub router 15.G.3 Contracts + e-sign + smart pre-fill (B.3 onyx-benchmarked, FASE 15 ola 3)
// PM pre-registro para evitar conflicto multi-agent canon en server/trpc/root.ts.
// CC-A llenará procedures completos: generate/sendForSignature/getStatus/cancel/getAuditTrail.

import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

export const contractsRouter = router({
  // STUB — activar FASE 15 ola 3 sub-bloque 15.G.3
  // Procedures pendientes:
  //   - generateContract (smart pre-fill engine: unidades + esquemas_pago + asesores.comision_pct + IVA)
  //   - sendForSignature (Mifiel STUB H1 ADR-018, DocuSign STUB H1)
  //   - getContractStatus
  //   - cancelContract
  //   - getContractAuditTrail
  //   - listMyContracts (parties only)
  ping: authenticatedProcedure.query(() => ({ ok: true, scope: 'contracts-stub' })),
});
