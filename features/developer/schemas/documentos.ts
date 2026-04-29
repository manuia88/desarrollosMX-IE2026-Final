import { z } from 'zod';

// FASE 15.G — Upload docs proyecto (M11 sub-flow)
// Storage bucket: project-documents (private). Path: {desarrolladora_id}/{proyecto_id}/{filename}.

export const DOC_TIPOS = [
  'planos',
  'memoria',
  'escrituras',
  'permisos',
  'carta_credito',
  'estudio_suelo',
  'factibilidad',
  'otros',
] as const;
export const docTipoEnum = z.enum(DOC_TIPOS);
export type DocTipo = z.infer<typeof docTipoEnum>;

export const DOC_STATUS = [
  'uploaded',
  'extracting',
  'extracted',
  'validated',
  'approved',
  'rejected',
] as const;
export const docStatusEnum = z.enum(DOC_STATUS);
export type DocStatus = z.infer<typeof docStatusEnum>;

export const documentListInput = z.object({
  proyectoId: z.string().uuid().optional(),
});
export type DocumentListInput = z.infer<typeof documentListInput>;

export const documentCreateInput = z.object({
  proyectoId: z.string().uuid(),
  tipo: docTipoEnum,
  nombre: z.string().min(1).max(200),
  storagePath: z.string().min(1).max(500),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type DocumentCreateInput = z.infer<typeof documentCreateInput>;

export const documentDeleteInput = z.object({
  documentId: z.string().uuid(),
});
export type DocumentDeleteInput = z.infer<typeof documentDeleteInput>;

export const documentApproveInput = z.object({
  documentId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});
export type DocumentApproveInput = z.infer<typeof documentApproveInput>;

export const documentSignedUrlInput = z.object({
  documentId: z.string().uuid(),
  expiresIn: z.number().int().min(60).max(3600).default(600),
});
export type DocumentSignedUrlInput = z.infer<typeof documentSignedUrlInput>;

export const documentRow = z.object({
  id: z.string().uuid(),
  desarrolladoraId: z.string().uuid().nullable(),
  proyectoId: z.string().uuid().nullable(),
  tipo: z.string(),
  nombre: z.string(),
  storagePath: z.string(),
  status: z.string(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  expiresAt: z.string().nullable(),
  uploadedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DocumentRow = z.infer<typeof documentRow>;
