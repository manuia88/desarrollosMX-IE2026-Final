// FASE 15.G.3 — Contracts router (B.3 onyx-benchmarked, ADR-060)
// Smart pre-fill engine + e-sign STUB Mifiel/DocuSign (4 señales ADR-018).

import { TRPCError } from '@trpc/server';
import {
  cancelContractInput,
  generateContractInput,
  getContractAuditTrailInput,
  getContractStatusInput,
  listMyContractsInput,
  sendForSignatureInput,
} from '@/features/operaciones/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import type {
  ContractAuditEvent,
  ContractSigner,
  ContractStatus,
  PreFilledContractData,
} from '@/shared/lib/contracts';
import {
  buildContractData,
  generateUnsignedPDF,
  sendDocusign,
  sendMifiel,
} from '@/shared/lib/contracts';
import { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface ContractRow {
  id: string;
  operacion_id: string;
  contract_type: string;
  status: ContractStatus;
  signers: ContractSigner[];
  audit_trail: ContractAuditEvent[];
  pre_filled_data: PreFilledContractData | Record<string, never>;
  template_version: string | null;
  mifiel_doc_id: string | null;
  docusign_envelope_id: string | null;
  pdf_unsigned_url: string | null;
  pdf_signed_url: string | null;
  sent_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CONTRACT_FIELDS =
  'id, operacion_id, contract_type, status, signers, audit_trail, pre_filled_data, template_version, mifiel_doc_id, docusign_envelope_id, pdf_unsigned_url, pdf_signed_url, sent_at, signed_at, expires_at, cancellation_reason, created_by, created_at, updated_at';

function isAdminProfile(profile: { rol?: string | null } | null | undefined): boolean {
  return profile?.rol === 'superadmin' || profile?.rol === 'mb_admin';
}

async function fetchContract(supabase: AdminClient, contractId: string): Promise<ContractRow> {
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_FIELDS)
    .eq('id', contractId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'contract not found' });
  return data as unknown as ContractRow;
}

async function ensureContractAccess(
  supabase: AdminClient,
  contract: ContractRow,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  if (isAdmin) return;
  const { data: op, error } = await supabase
    .from('operaciones')
    .select('asesor_id')
    .eq('id', contract.operacion_id)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  if (!op || op.asesor_id !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
}

function appendAudit(trail: ContractAuditEvent[], evt: ContractAuditEvent): ContractAuditEvent[] {
  return [...(Array.isArray(trail) ? trail : []), evt];
}

export const contractsRouter = router({
  generateContract: authenticatedProcedure
    .input(generateContractInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);

      const { data: op, error: opErr } = await supabase
        .from('operaciones')
        .select('id, asesor_id')
        .eq('id', input.operacionId)
        .maybeSingle();
      if (opErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: opErr.message });
      }
      if (!op) throw new TRPCError({ code: 'NOT_FOUND', message: 'operacion not found' });
      if (!isAdmin && op.asesor_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const preFilled = await buildContractData(supabase as never, {
        operacionId: input.operacionId,
        contractType: input.contractType,
        esquemaPagoId: input.esquemaPagoId ?? null,
      });

      const auditEvent: ContractAuditEvent = {
        event: 'created',
        actor_id: ctx.user.id,
        timestamp: new Date().toISOString(),
        metadata: { contract_type: input.contractType },
      };

      const insertPayload = {
        operacion_id: input.operacionId,
        contract_type: input.contractType,
        status: 'draft' as const,
        signers: input.signers,
        audit_trail: [auditEvent],
        pre_filled_data: preFilled,
        template_version: input.templateVersion,
        created_by: ctx.user.id,
      };

      const { data: inserted, error: insErr } = await supabase
        .from('contracts')
        .insert(insertPayload as never)
        .select(CONTRACT_FIELDS)
        .single();
      if (insErr || !inserted) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `contracts insert failed: ${insErr?.message ?? 'unknown'}`,
        });
      }

      const row = inserted as unknown as ContractRow;
      const pdf = await generateUnsignedPDF({
        contractId: row.id,
        preFilledData: preFilled,
      });

      const { data: updated, error: updErr } = await supabase
        .from('contracts')
        .update({ pdf_unsigned_url: pdf.pdf_url } as never)
        .eq('id', row.id)
        .select(CONTRACT_FIELDS)
        .single();
      if (updErr || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `contracts pdf url update failed: ${updErr?.message ?? 'unknown'}`,
        });
      }

      return updated as unknown as ContractRow;
    }),

  sendForSignature: authenticatedProcedure
    .input(sendForSignatureInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);
      const contract = await fetchContract(supabase, input.contractId);
      await ensureContractAccess(supabase, contract, ctx.user.id, isAdmin);
      if (contract.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `contract en estado ${contract.status} no puede enviarse a firma`,
        });
      }
      if (!contract.pdf_unsigned_url) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'contract sin PDF generado',
        });
      }

      const sendArgs = {
        contractId: contract.id,
        signers: contract.signers,
        pdfUrl: contract.pdf_unsigned_url,
      };
      const result =
        input.provider === 'mifiel' ? await sendMifiel(sendArgs) : await sendDocusign(sendArgs);

      const patch: Record<string, unknown> = {
        status: 'sent' as ContractStatus,
        sent_at: result.sent_at,
        audit_trail: appendAudit(contract.audit_trail, {
          event: 'sent',
          actor_id: ctx.user.id,
          timestamp: result.sent_at,
          metadata: { provider: input.provider, is_stub: true },
        }),
      };
      if (input.provider === 'mifiel' && 'mifiel_doc_id' in result) {
        patch.mifiel_doc_id = result.mifiel_doc_id;
      }
      if (input.provider === 'docusign' && 'docusign_envelope_id' in result) {
        patch.docusign_envelope_id = result.docusign_envelope_id;
      }

      const { data: updated, error: updErr } = await supabase
        .from('contracts')
        .update(patch as never)
        .eq('id', contract.id)
        .select(CONTRACT_FIELDS)
        .single();
      if (updErr || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `contracts send update failed: ${updErr?.message ?? 'unknown'}`,
        });
      }
      return updated as unknown as ContractRow;
    }),

  getContractStatus: authenticatedProcedure
    .input(getContractStatusInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);
      const contract = await fetchContract(supabase, input.contractId);
      await ensureContractAccess(supabase, contract, ctx.user.id, isAdmin);
      return contract;
    }),

  cancelContract: authenticatedProcedure
    .input(cancelContractInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);
      const contract = await fetchContract(supabase, input.contractId);
      await ensureContractAccess(supabase, contract, ctx.user.id, isAdmin);
      if (contract.status === 'signed' || contract.status === 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `contract en estado ${contract.status} no puede cancelarse`,
        });
      }
      const ts = new Date().toISOString();
      const patch = {
        status: 'cancelled' as ContractStatus,
        cancellation_reason: input.reason,
        audit_trail: appendAudit(contract.audit_trail, {
          event: 'cancelled',
          actor_id: ctx.user.id,
          timestamp: ts,
          metadata: { reason: input.reason },
        }),
      };
      const { data: updated, error: updErr } = await supabase
        .from('contracts')
        .update(patch as never)
        .eq('id', contract.id)
        .select(CONTRACT_FIELDS)
        .single();
      if (updErr || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `contracts cancel update failed: ${updErr?.message ?? 'unknown'}`,
        });
      }
      return updated as unknown as ContractRow;
    }),

  getContractAuditTrail: authenticatedProcedure
    .input(getContractAuditTrailInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);
      const contract = await fetchContract(supabase, input.contractId);
      await ensureContractAccess(supabase, contract, ctx.user.id, isAdmin);
      const trail = Array.isArray(contract.audit_trail) ? contract.audit_trail : [];
      return [...trail].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    }),

  listMyContracts: authenticatedProcedure
    .input(listMyContractsInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);

      let opIds: string[] | null = null;
      if (!isAdmin) {
        const { data: ops, error } = await supabase
          .from('operaciones')
          .select('id')
          .eq('asesor_id', ctx.user.id);
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        opIds = ((ops as Array<{ id: string }> | null) ?? []).map((o) => o.id);
        if (opIds.length === 0) return [];
      }

      let query = supabase
        .from('contracts')
        .select(CONTRACT_FIELDS)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (opIds && !input.operacionId) query = query.in('operacion_id', opIds);
      if (input.operacionId) query = query.eq('operacion_id', input.operacionId);
      if (input.status) query = query.eq('status', input.status);

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `contracts list failed: ${error.message}`,
        });
      }
      return (data ?? []) as unknown as ContractRow[];
    }),
});
