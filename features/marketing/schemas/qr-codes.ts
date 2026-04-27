import { z } from 'zod';

export const QR_DESTINO_TYPES = ['proyecto', 'landing', 'microsite'] as const;
export const qrDestinoTypeEnum = z.enum(QR_DESTINO_TYPES);
export type QRDestinoType = z.infer<typeof qrDestinoTypeEnum>;

export const createQRInput = z.object({
  destinoType: qrDestinoTypeEnum,
  destinoId: z.string().min(1).max(200),
  copy: z.string().max(200).optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  utmCampaign: z.string().max(120).optional(),
});
export type CreateQRInput = z.infer<typeof createQRInput>;

export const listQRsInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  destinoType: qrDestinoTypeEnum.optional(),
});
export type ListQRsInput = z.infer<typeof listQRsInput>;

export const deleteQRInput = z.object({
  id: z.string().uuid(),
});
export type DeleteQRInput = z.infer<typeof deleteQRInput>;
