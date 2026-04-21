import { z } from 'zod';

// Zod schemas para Newsletter (BLOQUE 11.J). Single Source of Truth para tRPC
// inputs + Supabase row parsing + form validation + webhook payloads.

// ---------------- Primitives ----------------

export const newsletterLocaleSchema = z.enum(['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'en-US']);

export const newsletterFrequencySchema = z.enum(['monthly', 'quarterly', 'annual']);

export const newsletterSubscriberStatusSchema = z.enum([
  'pending_confirmation',
  'active',
  'unsubscribed',
  'bounced',
  'complained',
]);

export const newsletterDeliveryStatusSchema = z.enum([
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'complained',
  'failed',
]);

export const newsletterTemplateSchema = z.enum([
  'monthly-mom',
  'scorecard-digest-preview',
  'scorecard-digest-post',
  'wrapped-annual',
  'confirm-email',
  'unsubscribe-confirm',
  'zone-personalized',
]);

export const newsletterEmailSchema = z.string().email().max(320).toLowerCase();

export const newsletterIsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

// ---------------- Preferences ----------------

export const newsletterSectionsSchema = z
  .object({
    pulse: z.boolean().default(true),
    migration: z.boolean().default(true),
    causal: z.boolean().default(true),
    alpha: z.boolean().default(false),
    scorecard: z.boolean().default(true),
    streaks: z.boolean().default(true),
  })
  .strict();

export const newsletterPreferencesSchema = z
  .object({
    frequency: newsletterFrequencySchema.default('monthly'),
    zone_scope_ids: z.array(z.string().min(1).max(128)).max(20).default([]),
    sections: newsletterSectionsSchema,
  })
  .strict();

// ---------------- tRPC inputs / API contracts ----------------

export const subscribeInput = z
  .object({
    email: newsletterEmailSchema,
    locale: newsletterLocaleSchema.default('es-MX'),
    preferences: newsletterPreferencesSchema.optional(),
    consentLfpdppp: z.boolean().refine((v) => v === true, {
      message: 'consent_required',
    }),
    sourceScopeId: z.string().min(1).max(128).optional(),
  })
  .strict();

export const confirmTokenInput = z
  .object({
    token: z.string().min(20).max(512),
  })
  .strict();

export const unsubscribeTokenInput = z
  .object({
    token: z.string().min(20).max(512),
    reason: z.string().max(500).optional(),
  })
  .strict();

export const updatePreferencesInput = z
  .object({
    token: z.string().min(20).max(512),
    preferences: newsletterPreferencesSchema,
  })
  .strict();

export const getWrappedInput = z
  .object({
    year: z.number().int().min(2024).max(2100),
    countryCode: z.string().length(2).default('MX'),
  })
  .strict();

export const getStreaksInput = z
  .object({
    countryCode: z.string().length(2).default('MX'),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();

// ---------------- Webhook payloads ----------------

export const resendWebhookEventSchema = z
  .object({
    type: z.enum([
      'email.sent',
      'email.delivered',
      'email.opened',
      'email.clicked',
      'email.bounced',
      'email.complained',
      'email.failed',
    ]),
    created_at: z.string(),
    data: z
      .object({
        email_id: z.string(),
        to: z.array(z.string()).optional(),
        subject: z.string().optional(),
      })
      .passthrough(),
  })
  .strict();

// ---------------- Inferred types ----------------

export type SubscribeInput = z.infer<typeof subscribeInput>;
export type ConfirmTokenInput = z.infer<typeof confirmTokenInput>;
export type UnsubscribeTokenInput = z.infer<typeof unsubscribeTokenInput>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>;
export type GetWrappedInput = z.infer<typeof getWrappedInput>;
export type GetStreaksInput = z.infer<typeof getStreaksInput>;
export type ResendWebhookEvent = z.infer<typeof resendWebhookEventSchema>;
