// Zod schemas for /api/v1/keys/* (management endpoints).
// Authenticated via Supabase session cookie (not via api key).

import { z } from 'zod';

export const createKeyInputSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string().min(1).max(64)).max(16).default(['tier:free']),
  expires_at: z.string().datetime({ offset: true }).optional(),
});
export type CreateKeyInput = z.infer<typeof createKeyInputSchema>;

export const createKeyDataSchema = z.object({
  api_key_id: z.string().uuid(),
  raw_key: z.string().min(16),
  name: z.string(),
  scopes: z.array(z.string()),
  expires_at: z.string().nullable(),
});
export type CreateKeyData = z.infer<typeof createKeyDataSchema>;

export const listedKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key_prefix: z.string(),
  scopes: z.array(z.string()),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
});
export type ListedKey = z.infer<typeof listedKeySchema>;

export const listKeysDataSchema = z.object({
  items: z.array(listedKeySchema),
});
export type ListKeysData = z.infer<typeof listKeysDataSchema>;

export const revokeKeyInputSchema = z.object({
  api_key_id: z.string().uuid(),
});
export type RevokeKeyInput = z.infer<typeof revokeKeyInputSchema>;

export const revokeKeyDataSchema = z.object({
  api_key_id: z.string().uuid(),
  revoked_at: z.string(),
});
export type RevokeKeyData = z.infer<typeof revokeKeyDataSchema>;
