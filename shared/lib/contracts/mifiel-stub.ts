// FASE 15.G.3 — Mifiel client STUB (ADR-018 4 señales)
//
// Real Mifiel REST API integration deferred to H2 (post API key purchase).
// 4 señales ADR-018 enforced:
//   1. Comentario en código (este header)
//   2. UI badge "Próximamente Mifiel" en ContractDrawer
//   3. Comment en doc autoritative ADR-060 §STUB-status
//   4. tRPC procedure devuelve mensaje 'STUB' en mifiel_doc_id
//
// STUB H1 returns deterministic ID prefixed STUB_ y timestamp ahora.

import { randomUUID } from 'node:crypto';
import type { ContractSigner } from './types';

export interface MifielSendResult {
  mifiel_doc_id: string;
  sent_at: string;
  provider: 'mifiel';
  is_stub: true;
}

export interface MifielSendArgs {
  contractId: string;
  signers: ContractSigner[];
  pdfUrl: string;
}

export async function sendDocumentForSignature(args: MifielSendArgs): Promise<MifielSendResult> {
  if (!args.contractId) throw new Error('mifiel-stub: contractId required');
  if (!args.signers.length) throw new Error('mifiel-stub: at least 1 signer required');
  await Promise.resolve();
  return {
    mifiel_doc_id: `STUB_MIFIEL_${randomUUID()}`,
    sent_at: new Date().toISOString(),
    provider: 'mifiel',
    is_stub: true,
  };
}

export interface MifielStatusResult {
  mifiel_doc_id: string;
  status: 'pending' | 'partial' | 'signed' | 'expired';
  signed_at: string | null;
  is_stub: true;
}

export async function getDocumentStatus(mifielDocId: string): Promise<MifielStatusResult> {
  await Promise.resolve();
  return {
    mifiel_doc_id: mifielDocId,
    status: 'pending',
    signed_at: null,
    is_stub: true,
  };
}
