import { z } from 'zod';

export const PHOTO_CATEGORIES = [
  'sala',
  'cocina',
  'recamara',
  'bano',
  'fachada',
  'exterior',
  'plano',
] as const;
export const photoCategoryEnum = z.enum(PHOTO_CATEGORIES);
export type PhotoCategory = z.infer<typeof photoCategoryEnum>;

export const PHOTO_CLASSIFY_STATUS = ['pending', 'done', 'error'] as const;
export const photoClassifyStatusEnum = z.enum(PHOTO_CLASSIFY_STATUS);
export type PhotoClassifyStatus = z.infer<typeof photoClassifyStatusEnum>;

export const uploadPhotoInput = z.object({
  storagePath: z.string().min(1).max(500),
  url: z.string().url().optional(),
  mimeType: z.string().max(80).optional(),
  fileSizeBytes: z.number().int().min(0).max(50_000_000).optional(),
  proyectoId: z.string().uuid().optional(),
  captacionId: z.string().uuid().optional(),
  displayOrder: z.number().int().min(0).max(1000).default(0),
});
export type UploadPhotoInput = z.infer<typeof uploadPhotoInput>;

export const classifyPhotoInput = z.object({
  photoId: z.string().uuid(),
});
export type ClassifyPhotoInput = z.infer<typeof classifyPhotoInput>;

export const listPhotosByProjectInput = z.object({
  proyectoId: z.string().uuid(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type ListPhotosByProjectInput = z.infer<typeof listPhotosByProjectInput>;

export const listPhotosByUserInput = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  classifyStatus: photoClassifyStatusEnum.optional(),
});
export type ListPhotosByUserInput = z.infer<typeof listPhotosByUserInput>;

export const deletePhotoInput = z.object({
  id: z.string().uuid(),
});
export type DeletePhotoInput = z.infer<typeof deletePhotoInput>;

export const PHOTO_CATEGORY_LABELS_ES = {
  sala: 'Sala',
  cocina: 'Cocina',
  recamara: 'Recámara',
  bano: 'Baño',
  fachada: 'Fachada',
  exterior: 'Exterior',
  plano: 'Plano',
} as const satisfies Record<PhotoCategory, string>;
