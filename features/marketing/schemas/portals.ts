import { z } from 'zod';

export const PORTAL_NAMES = [
  'inmuebles24',
  'mercadolibre',
  'vivanuncios',
  'icasas',
  'propiedades_com',
  'facebook_marketplace',
  'easybroker',
] as const;
export const portalNameEnum = z.enum(PORTAL_NAMES);
export type PortalName = z.infer<typeof portalNameEnum>;

export const PORTAL_REAL_H1 = ['inmuebles24', 'easybroker'] as const;
export const PORTAL_STUB_H2 = [
  'mercadolibre',
  'vivanuncios',
  'icasas',
  'propiedades_com',
  'facebook_marketplace',
] as const;

export const PUBLICATION_STATUS = ['pending', 'published', 'error', 'retry'] as const;
export const publicationStatusEnum = z.enum(PUBLICATION_STATUS);
export type PublicationStatus = z.infer<typeof publicationStatusEnum>;

export const portalCredentialsSchema = z
  .record(z.string(), z.string())
  .refine((d) => Object.keys(d).length > 0, {
    message: 'credentials must be non-empty key/value map',
  });
export type PortalCredentials = z.infer<typeof portalCredentialsSchema>;

export const configurePortalInput = z.object({
  portal: portalNameEnum,
  credentials: portalCredentialsSchema,
  isActive: z.boolean().default(true),
});
export type ConfigurePortalInput = z.infer<typeof configurePortalInput>;

export const publishToPortalInput = z.object({
  portal: portalNameEnum,
  projectId: z.string().uuid(),
});
export type PublishToPortalInput = z.infer<typeof publishToPortalInput>;

export const getPortalStatusInput = z.object({
  portal: portalNameEnum,
});
export type GetPortalStatusInput = z.infer<typeof getPortalStatusInput>;

export const listPortalConfigsInput = z.object({
  limit: z.number().int().min(1).max(20).default(20),
});
export type ListPortalConfigsInput = z.infer<typeof listPortalConfigsInput>;

export const listPublicationsInput = z.object({
  projectId: z.string().uuid().optional(),
  portal: portalNameEnum.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export type ListPublicationsInput = z.infer<typeof listPublicationsInput>;
