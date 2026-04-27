import { NextResponse } from 'next/server';
import type { PortalName } from '@/features/marketing/schemas/portals';

// STUB ADR-018 — activar en F14.C.1 (sub-fase portales adicionales) con [dependencia: contracts portal API]
// 4 señales: comentario inline + UI badge próximamente F14.C.1 + doc módulo + 501 Not Implemented (este return)

export function makeStubWebhookHandler(portal: PortalName) {
  return async (_request: Request): Promise<Response> => {
    return NextResponse.json(
      {
        error: 'not_implemented',
        message: `Portal ${portal} webhook se activa en F14.C.1 sub-fase portales adicionales`,
      },
      { status: 501 },
    );
  };
}
