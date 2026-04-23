// Zod schemas for widget-embed — valida URL params y customization.

import { z } from 'zod';
import { WIDGET_SCOPE_TYPES, WIDGET_VARIANTS } from '../types';

const SCOPE_ID_REGEX = /^[a-z0-9][a-z0-9-]{0,120}$/i;

export const widgetVariantSchema = z.enum(WIDGET_VARIANTS);
export const widgetScopeTypeSchema = z.enum(WIDGET_SCOPE_TYPES);

export const widgetScopeIdSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(SCOPE_ID_REGEX, 'invalid scope id format');

export const widgetCustomizationSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    locale: z.string().min(2).max(8).optional(),
    ctaUrl: z.string().url().max(400).optional(),
  })
  .strict();

export const widgetEmbedParamsSchema = z
  .object({
    variant: widgetVariantSchema,
    scopeType: widgetScopeTypeSchema,
    scopeId: widgetScopeIdSchema,
    compareScopeId: widgetScopeIdSchema.optional(),
    customization: widgetCustomizationSchema.optional(),
  })
  .strict();

export type WidgetEmbedParamsInput = z.infer<typeof widgetEmbedParamsSchema>;
