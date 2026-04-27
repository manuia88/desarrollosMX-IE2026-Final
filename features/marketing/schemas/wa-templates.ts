import { z } from 'zod';

export const WA_TEMPLATE_CATEGORIES = ['marketing', 'utility'] as const;
export const waTemplateCategoryEnum = z.enum(WA_TEMPLATE_CATEGORIES);
export type WATemplateCategory = z.infer<typeof waTemplateCategoryEnum>;

export const WA_TEMPLATE_HEADER_TYPES = ['none', 'text', 'image', 'video'] as const;
export const waTemplateHeaderTypeEnum = z.enum(WA_TEMPLATE_HEADER_TYPES);
export type WATemplateHeaderType = z.infer<typeof waTemplateHeaderTypeEnum>;

export const WA_TEMPLATE_STATUS = ['draft', 'pending', 'approved', 'rejected'] as const;
export const waTemplateStatusEnum = z.enum(WA_TEMPLATE_STATUS);
export type WATemplateStatus = z.infer<typeof waTemplateStatusEnum>;

export const WA_TEMPLATE_BUTTON_TYPES = ['cta_url', 'quick_reply'] as const;
export const waTemplateButtonTypeEnum = z.enum(WA_TEMPLATE_BUTTON_TYPES);
export type WATemplateButtonType = z.infer<typeof waTemplateButtonTypeEnum>;

export const placeholderSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  example: z.string().max(200).optional(),
});
export type Placeholder = z.infer<typeof placeholderSchema>;

export const buttonSchema = z.object({
  type: waTemplateButtonTypeEnum,
  label: z.string().min(1).max(40),
  url: z.string().url().optional(),
});
export type WATemplateButton = z.infer<typeof buttonSchema>;

export const createTemplateInput = z.object({
  name: z.string().min(3).max(100),
  category: waTemplateCategoryEnum,
  body: z.string().min(1).max(1024),
  placeholders: z.array(placeholderSchema).max(10).default([]),
  headerType: waTemplateHeaderTypeEnum.default('none'),
  headerContent: z.string().max(500).optional(),
  footer: z.string().max(60).optional(),
  buttons: z.array(buttonSchema).max(3).default([]),
});
export type CreateTemplateInput = z.infer<typeof createTemplateInput>;

export const listTemplatesInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  status: waTemplateStatusEnum.optional(),
});
export type ListTemplatesInput = z.infer<typeof listTemplatesInput>;

export const submitToMetaInput = z.object({
  templateId: z.string().uuid(),
});
export type SubmitToMetaInput = z.infer<typeof submitToMetaInput>;

export const deleteTemplateInput = z.object({
  id: z.string().uuid(),
});
export type DeleteTemplateInput = z.infer<typeof deleteTemplateInput>;
