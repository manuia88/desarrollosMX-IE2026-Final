// F14.F.5 Sprint 4 UPGRADE 5 — DMX Studio iCal export types (pure JS, RFC 5545).
// Zod schemas for entries serialized into a VCALENDAR file (Google / Outlook /
// Apple compatible).

import { z } from 'zod';

export const ICalEntryInputSchema = z.object({
  uid: z.string().min(1),
  start: z.string().datetime({ offset: true }), // ISO 8601 with TZ offset or Z
  end: z.string().datetime({ offset: true }).nullable().optional(),
  summary: z.string().min(1),
  description: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  location: z.string().nullable().optional(),
});
export type ICalEntryInput = z.infer<typeof ICalEntryInputSchema>;

export const ICalUserInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
export type ICalUserInfo = z.infer<typeof ICalUserInfoSchema>;
