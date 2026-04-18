import { z } from 'zod';

export const statCardSpecSchema = z.object({
  type: z.literal('stat_card'),
  label: z.string().min(1).max(80),
  value: z.union([z.string(), z.number()]),
  trend: z.number().optional(),
  color: z.string().max(24).optional(),
});

export const comparisonTableSpecSchema = z.object({
  type: z.literal('comparison_table'),
  columns: z.array(z.string().min(1).max(60)).min(2).max(8),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).max(30),
});

export const miniMapSpecSchema = z.object({
  type: z.literal('mini_map'),
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number().min(1).max(20),
  markers: z
    .array(
      z.object({
        lng: z.number(),
        lat: z.number(),
        label: z.string().max(60).optional(),
      }),
    )
    .max(50),
});

export const timelineSpecSchema = z.object({
  type: z.literal('timeline'),
  items: z
    .array(
      z.object({
        date: z.string().min(4).max(24),
        label: z.string().min(1).max(120),
      }),
    )
    .min(1)
    .max(20),
});

export const ctaCardSpecSchema = z.object({
  type: z.literal('cta_card'),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  action: z.object({
    label: z.string().min(1).max(40),
    href: z.string().min(1).max(500),
  }),
});

export const generativeSpecSchema = z.discriminatedUnion('type', [
  statCardSpecSchema,
  comparisonTableSpecSchema,
  miniMapSpecSchema,
  timelineSpecSchema,
  ctaCardSpecSchema,
]);

export type GenerativeSpec = z.infer<typeof generativeSpecSchema>;
