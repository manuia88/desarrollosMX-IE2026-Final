import { z } from 'zod';
import { WIKI_SECTION_KEYS } from '@/features/atlas/types';

export const wikiSectionKeySchema = z.enum(WIKI_SECTION_KEYS);

export const wikiSectionSchema = z.object({
  key: wikiSectionKeySchema,
  heading: z.string().min(1).max(120),
  content_md: z.string().min(1),
});

export const wikiEntrySchema = z.object({
  id: z.string().uuid(),
  colonia_id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  label: z.string().min(1),
  version: z.number().int().min(1),
  content_md: z.string().min(1),
  sections: z.array(wikiSectionSchema),
  published: z.boolean(),
  reviewed: z.boolean(),
  edited_at: z.string(),
});

export const atlasListedColoniaSchema = z.object({
  slug: z.string().min(1),
  colonia_id: z.string().uuid(),
  label: z.string().min(1),
  alcaldia: z.string().nullable(),
  country_code: z.string().min(2).max(2),
});

export const getByColoniaSlugInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

export const listPublishedColoniasInputSchema = z.object({
  countryCode: z.string().min(2).max(2).default('MX'),
  limit: z.number().int().min(1).max(500).default(200),
});

export const slugifyInputSchema = z.string().min(1).max(200);
