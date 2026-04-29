// FASE 15.G.3 — DocuSign client STUB (ADR-018 4 señales)
//
// Real DocuSign REST API integration deferred to H2.

import { randomUUID } from 'node:crypto';
import type { ContractSigner } from './types';

export interface DocusignSendResult {
  docusign_envelope_id: string;
  sent_at: string;
  provider: 'docusign';
  is_stub: true;
}

export interface DocusignSendArgs {
  contractId: string;
  signers: ContractSigner[];
  pdfUrl: string;
}

export async function sendDocumentForSignature(
  args: DocusignSendArgs,
): Promise<DocusignSendResult> {
  if (!args.contractId) throw new Error('docusign-stub: contractId required');
  if (!args.signers.length) throw new Error('docusign-stub: at least 1 signer required');
  await Promise.resolve();
  return {
    docusign_envelope_id: `STUB_DOCUSIGN_${randomUUID()}`,
    sent_at: new Date().toISOString(),
    provider: 'docusign',
    is_stub: true,
  };
}

export interface DocusignStatusResult {
  docusign_envelope_id: string;
  status: 'sent' | 'delivered' | 'completed' | 'declined' | 'voided';
  completed_at: string | null;
  is_stub: true;
}

export async function getEnvelopeStatus(envelopeId: string): Promise<DocusignStatusResult> {
  await Promise.resolve();
  return {
    docusign_envelope_id: envelopeId,
    status: 'sent',
    completed_at: null,
    is_stub: true,
  };
}
