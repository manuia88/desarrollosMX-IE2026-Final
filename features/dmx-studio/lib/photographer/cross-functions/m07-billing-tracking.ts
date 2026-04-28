// F14.F.10 Sprint 9 BIBLIA — Cross-function M07 Operaciones billing tracking STUB.
// STUB ADR-018 H1 → tracking via studio_photographer_clients only.
// H2 flip cuando operaciones.operacion_type CHECK altered para 'studio_video_sale'.
//
// 4 señales STUB:
//   1. Comentario header explícito (este).
//   2. Wrapper llama recordVideoSaleAsOperacion del shared lib (que retorna
//      NOT_IMPLEMENTED_H2).
//   3. Documentado en shared/lib/photographer-clients-cross-feature/_README.md.
//   4. UI condicional flag operaciones_export_enabled (false H1 hardcoded canon).

import {
  type RecordVideoSaleAsOperacionInput,
  recordVideoSaleAsOperacion,
} from '@/shared/lib/photographer-clients-cross-feature';

/** Hardcoded H1 canon: M07 Operaciones export disabled hasta H2 CHECK alter. */
export const OPERACIONES_EXPORT_ENABLED = false as const;

export interface RecordVideoSaleStubResult {
  readonly ok: false;
  readonly reason: 'NOT_IMPLEMENTED_H2';
  readonly fallback: 'studio_photographer_clients_only';
}

/**
 * STUB ADR-018 H1 → tracking via studio_photographer_clients only.
 * Wrapper directo sobre shared lib STUB. H1 path: tracking via
 * studio_photographer_clients.total_revenue_attributed (commission/tracker.ts
 * trackVideoSale).
 *
 * H2 flip path: alter operaciones.operacion_type CHECK + reemplazar STUB body
 * en shared lib + flip OPERACIONES_EXPORT_ENABLED=true + UI muestra "Exportar
 * a M07 Operaciones".
 */
export async function recordVideoSaleM07(
  input: RecordVideoSaleAsOperacionInput,
): Promise<RecordVideoSaleStubResult> {
  const result = await recordVideoSaleAsOperacion(input);
  if (!result.ok) {
    return {
      ok: false,
      reason: 'NOT_IMPLEMENTED_H2',
      fallback: 'studio_photographer_clients_only',
    };
  }
  // Unreachable en H1 — keep for type-safety H2 forward-compat.
  return {
    ok: false,
    reason: 'NOT_IMPLEMENTED_H2',
    fallback: 'studio_photographer_clients_only',
  };
}

export interface OperacionesExportEnabledCheck {
  readonly enabled: false;
  readonly reason: 'STUB_ADR_018_H1_OPERACIONES_CHECK_NOT_ALTERED';
}

/** Check sincrónico para UI conditional rendering — H1 always returns disabled. */
export function isOperacionesExportEnabled(): OperacionesExportEnabledCheck {
  return {
    enabled: OPERACIONES_EXPORT_ENABLED,
    reason: 'STUB_ADR_018_H1_OPERACIONES_CHECK_NOT_ALTERED',
  };
}
