// F14.F.5 Sprint 4 — Calendario IA + AI mood + smart timing.
// Schemas Zod SSoT (canon regla 4): un schema = type + validacion runtime.

import { z } from 'zod';

export const CALENDAR_CHANNEL_VALUES = [
  'instagram',
  'tiktok',
  'facebook',
  'wa_status',
  'linkedin',
  'email',
  'blog',
] as const;
export const CalendarChannelSchema = z.enum(CALENDAR_CHANNEL_VALUES);
export type CalendarChannel = z.infer<typeof CalendarChannelSchema>;

export const CALENDAR_CONTENT_TYPE_VALUES = [
  'video',
  'reel',
  'story',
  'post',
  'email_blast',
  'blog_post',
] as const;
export const CalendarContentTypeSchema = z.enum(CALENDAR_CONTENT_TYPE_VALUES);
export type CalendarContentType = z.infer<typeof CalendarContentTypeSchema>;

export const CALENDAR_STATUS_VALUES = [
  'planned',
  'scheduled',
  'published',
  'skipped',
  'failed',
] as const;
export const CalendarStatusSchema = z.enum(CALENDAR_STATUS_VALUES);
export type CalendarStatus = z.infer<typeof CalendarStatusSchema>;

// 5 wayfinding tints canon ADR-050 narrative (UPGRADE 1 mood).
export const CALENDAR_TOPIC_KIND_VALUES = [
  'marca',
  'propiedad',
  'zona',
  'remarketing',
  'email',
] as const;
export const CalendarTopicKindSchema = z.enum(CALENDAR_TOPIC_KIND_VALUES);
export type CalendarTopicKind = z.infer<typeof CalendarTopicKindSchema>;

export const MOOD_VALUES = ['low', 'neutral', 'high', 'celebratory'] as const;
export const MoodSchema = z.enum(MOOD_VALUES);
export type Mood = z.infer<typeof MoodSchema>;

export const MoodDetectionInputSchema = z.object({
  closedDeals7d: z.number().int().min(0),
  closedDeals30d: z.number().int().min(0),
  leads7d: z.number().int().min(0),
});
export type MoodDetectionInput = z.infer<typeof MoodDetectionInputSchema>;

export const MoodDetectionResultSchema = z.object({
  mood: MoodSchema,
  toneHint: z.string().min(1),
});
export type MoodDetectionResult = z.infer<typeof MoodDetectionResultSchema>;

export const OptimalTimingSchema = z.object({
  hour: z.number().int().min(0).max(23),
  reason: z.string().min(1),
});
export type OptimalTiming = z.infer<typeof OptimalTimingSchema>;

export const CalendarDayEntrySchema = z.object({
  id: z.string().uuid(),
  scheduledFor: z.string(), // YYYY-MM-DD
  scheduledTime: z.string().nullable(),
  channel: CalendarChannelSchema,
  contentType: CalendarContentTypeSchema,
  topicKind: CalendarTopicKindSchema,
  topic: z.string().nullable(),
  notes: z.string().nullable(),
  status: CalendarStatusSchema,
  projectId: z.string().uuid().nullable(),
  aiGenerated: z.boolean(),
});
export type CalendarDayEntry = z.infer<typeof CalendarDayEntrySchema>;

export const CalendarMonthSchema = z.object({
  monthDate: z.string(), // YYYY-MM-01
  entries: z.array(CalendarDayEntrySchema),
  mood: MoodSchema.nullable(),
  toneHint: z.string().nullable(),
});
export type CalendarMonth = z.infer<typeof CalendarMonthSchema>;

export const GenerateMonthlyCalendarInputSchema = z.object({
  userId: z.string().uuid(),
  monthDate: z.string().regex(/^\d{4}-\d{2}-01$/, 'monthDate must be YYYY-MM-01'),
});
export type GenerateMonthlyCalendarInput = z.infer<typeof GenerateMonthlyCalendarInputSchema>;

export const GenerateMonthlyCalendarResultSchema = z.object({
  entriesCreated: z.number().int().min(0),
  costUsd: z.number().min(0),
  mood: MoodSchema,
});
export type GenerateMonthlyCalendarResult = z.infer<typeof GenerateMonthlyCalendarResultSchema>;
