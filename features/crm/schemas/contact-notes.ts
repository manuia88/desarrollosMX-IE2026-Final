import { z } from 'zod';
import { uuidSchema } from './shared';

export const contactNoteLevelEnum = z.enum(['personal', 'colaborativo', 'sistema']);
export type ContactNoteLevel = z.infer<typeof contactNoteLevelEnum>;

export const contactNoteSchema = z.object({
  id: uuidSchema,
  lead_id: uuidSchema,
  level: contactNoteLevelEnum,
  author_user_id: uuidSchema,
  content_md: z.string().min(1).max(8000),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ContactNote = z.infer<typeof contactNoteSchema>;

export const contactNoteListInput = z.object({
  lead_id: uuidSchema,
  limit: z.number().int().min(1).max(200).default(50),
});
export type ContactNoteListInput = z.infer<typeof contactNoteListInput>;

export const contactNoteCreateInput = z.object({
  lead_id: uuidSchema,
  level: contactNoteLevelEnum,
  content_md: z.string().trim().min(1).max(8000),
});
export type ContactNoteCreateInput = z.infer<typeof contactNoteCreateInput>;

export const contactNoteUpdateInput = z.object({
  id: uuidSchema,
  content_md: z.string().trim().min(1).max(8000),
});
export type ContactNoteUpdateInput = z.infer<typeof contactNoteUpdateInput>;

export const contactNoteDeleteInput = z.object({
  id: uuidSchema,
});
export type ContactNoteDeleteInput = z.infer<typeof contactNoteDeleteInput>;
