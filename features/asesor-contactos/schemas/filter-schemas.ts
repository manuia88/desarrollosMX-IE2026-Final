import { z } from 'zod';

export const contactoStatusEnum = z.enum(['new', 'qualified', 'nurturing', 'converted', 'lost']);
export type ContactoStatus = z.infer<typeof contactoStatusEnum>;

export const contactoViewEnum = z.enum(['grid', 'list', 'kanban']);
export type ContactoView = z.infer<typeof contactoViewEnum>;

export const contactoTabEnum = z.enum(['all', 'mine', 'team', 'recent']);
export type ContactoTab = z.infer<typeof contactoTabEnum>;

export const contactoSortEnum = z.enum(['recent', 'qualification', 'name']);
export type ContactoSort = z.infer<typeof contactoSortEnum>;

export const filtersSchema = z.object({
  tab: contactoTabEnum.default('mine'),
  view: contactoViewEnum.default('grid'),
  sort: contactoSortEnum.default('recent'),
  status: contactoStatusEnum.optional(),
  q: z.string().max(80).optional(),
  countryCode: z.string().length(2).optional(),
  drawer: z.string().uuid().optional(),
});

export type ContactosFilters = z.infer<typeof filtersSchema>;
export type ContactosSearchParams = Partial<Record<keyof ContactosFilters, string>>;

export const TABS: readonly ContactoTab[] = ['all', 'mine', 'team', 'recent'] as const;
export const VIEWS: readonly ContactoView[] = ['grid', 'list', 'kanban'] as const;
export const SORTS: readonly ContactoSort[] = ['recent', 'qualification', 'name'] as const;
export const STATUSES: readonly ContactoStatus[] = [
  'new',
  'qualified',
  'nurturing',
  'converted',
  'lost',
] as const;

export const DISC_KEYS = ['D', 'I', 'S', 'C'] as const;
export type DiscKey = (typeof DISC_KEYS)[number];

export interface DiscScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface BigFiveScores {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
}
