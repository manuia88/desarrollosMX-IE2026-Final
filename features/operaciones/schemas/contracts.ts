import { z } from 'zod';

export const CONTRACT_TYPE = ['aps', 'promesa', 'reserva'] as const;
export const contractTypeEnum = z.enum(CONTRACT_TYPE);
export type ContractTypeInput = z.infer<typeof contractTypeEnum>;

export const CONTRACT_STATUS = [
  'draft',
  'sent',
  'viewed',
  'signed',
  'cancelled',
  'expired',
] as const;
export const contractStatusEnum = z.enum(CONTRACT_STATUS);
export type ContractStatusInput = z.infer<typeof contractStatusEnum>;

export const CONTRACT_PROVIDER = ['mifiel', 'docusign'] as const;
export const contractProviderEnum = z.enum(CONTRACT_PROVIDER);
export type ContractProviderInput = z.infer<typeof contractProviderEnum>;

export const CONTRACT_SIGNER_ROLE = ['comprador', 'vendedor', 'asesor', 'desarrolladora'] as const;
export const contractSignerRoleEnum = z.enum(CONTRACT_SIGNER_ROLE);

export const contractSignerSchema = z.object({
  role: contractSignerRoleEnum,
  name: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  rfc: z.string().max(20).optional().nullable(),
  party_id: z.string().uuid().optional().nullable(),
});
export type ContractSignerInput = z.infer<typeof contractSignerSchema>;

export const generateContractInput = z.object({
  operacionId: z.string().uuid(),
  contractType: contractTypeEnum,
  signers: z.array(contractSignerSchema).min(1).max(8),
  esquemaPagoId: z.string().uuid().optional().nullable(),
  templateVersion: z.string().max(20).default('v1'),
});
export type GenerateContractInput = z.infer<typeof generateContractInput>;

export const sendForSignatureInput = z.object({
  contractId: z.string().uuid(),
  provider: contractProviderEnum,
});
export type SendForSignatureInput = z.infer<typeof sendForSignatureInput>;

export const getContractStatusInput = z.object({
  contractId: z.string().uuid(),
});
export type GetContractStatusInput = z.infer<typeof getContractStatusInput>;

export const cancelContractInput = z.object({
  contractId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});
export type CancelContractInput = z.infer<typeof cancelContractInput>;

export const getContractAuditTrailInput = z.object({
  contractId: z.string().uuid(),
});
export type GetContractAuditTrailInput = z.infer<typeof getContractAuditTrailInput>;

export const listMyContractsInput = z.object({
  status: contractStatusEnum.optional(),
  operacionId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export type ListMyContractsInput = z.infer<typeof listMyContractsInput>;
