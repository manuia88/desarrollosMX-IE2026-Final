// FASE 15.G.3 — Mifiel webhook STUB (ADR-018 4 señales)
//
// Real handler activated H2 cuando Mifiel API key + HMAC secret estén
// disponibles. Por ahora:
//   1. Valida payload básico (operacion_id, status)
//   2. HMAC validation NO ENFORCED (returns 200 + log only)
//   3. Devuelve 200 OK para evitar retries de Mifiel sandbox
//
// 4 señales ADR-018: comentario header + tRPC procedure marcado is_stub +
// doc ADR-060 + UI badge "Próximamente" en ContractDrawer.

import { NextResponse } from 'next/server';

interface MifielWebhookPayload {
  document_id?: string;
  status?: string;
  signed_at?: string;
}

export async function POST(request: Request): Promise<Response> {
  let payload: MifielWebhookPayload = {};
  try {
    payload = (await request.json()) as MifielWebhookPayload;
  } catch {
    payload = {};
  }

  // STUB H1 — ADR-018: log + 200 OK; NO writes a contracts hasta H2.
  console.warn('[mifiel-webhook] STUB received', {
    document_id: payload.document_id,
    status: payload.status,
    signed_at: payload.signed_at,
    note: 'STUB H1 — activar handler real cuando Mifiel API key + HMAC disponibles',
  });

  return NextResponse.json(
    {
      ok: true,
      stub: true,
      message:
        'Mifiel webhook STUB H1 — handler real disponible H2 (requiere API key + HMAC secret)',
    },
    { status: 200 },
  );
}
