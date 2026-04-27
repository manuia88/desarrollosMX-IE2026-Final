import { z } from 'zod';
import { slugSchema } from '@/features/marketing/schemas/landings';

export const createFolderInput = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  slug: slugSchema,
  clienteContactoId: z.string().uuid().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderInput>;

export const updateFolderInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateFolderInput = z.infer<typeof updateFolderInput>;

export const listFoldersInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  onlyActive: z.boolean().default(false),
});
export type ListFoldersInput = z.infer<typeof listFoldersInput>;

export const addProjectInput = z.object({
  folderId: z.string().uuid(),
  projectId: z.string().uuid(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export type AddProjectInput = z.infer<typeof addProjectInput>;

export const removeProjectInput = z.object({
  folderId: z.string().uuid(),
  projectId: z.string().uuid(),
});
export type RemoveProjectInput = z.infer<typeof removeProjectInput>;

export const getPublicGalleryInput = z.object({
  slug: slugSchema,
});
export type GetPublicGalleryInput = z.infer<typeof getPublicGalleryInput>;

export const deleteFolderInput = z.object({
  id: z.string().uuid(),
});
export type DeleteFolderInput = z.infer<typeof deleteFolderInput>;
