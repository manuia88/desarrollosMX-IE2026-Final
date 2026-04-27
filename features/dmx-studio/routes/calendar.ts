// F14.F.5 Sprint 4 — DMX Studio calendar IA + AI mood + smart timing.
// Procedures: getMonth + generateMonth + getDaySuggestion + markAsGenerated.
// exportICal DEFER sub-agent 4 (lib/calendar/ical-export.ts).

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { generateMonthlyCalendar } from '@/features/dmx-studio/lib/calendar';
import { exportICalProcedure } from '@/features/dmx-studio/lib/calendar/ical-procedure';
import { detectMood } from '@/features/dmx-studio/lib/calendar/mood-detector';
import {
  getOptimalTiming,
  type SmartTimingPlatform,
} from '@/features/dmx-studio/lib/calendar/smart-timing';
import type {
  CalendarChannel,
  CalendarContentType,
  CalendarStatus,
  CalendarTopicKind,
  Mood,
} from '@/features/dmx-studio/lib/calendar/types';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const monthDateInput = z.object({
  monthDate: z.string().regex(/^\d{4}-\d{2}-01$/, 'monthDate must be YYYY-MM-01'),
});

const dateInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

const markGeneratedInput = z.object({
  entryId: z.string().uuid(),
  projectId: z.string().uuid(),
});

function lastDayOfMonth(monthDate: string): string {
  const [year, month] = monthDate.split('-').map(Number);
  if (!year || !month) return monthDate;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

interface CalendarMonthEntryDTO {
  readonly id: string;
  readonly scheduledFor: string;
  readonly scheduledTime: string | null;
  readonly channel: CalendarChannel;
  readonly contentType: CalendarContentType;
  readonly topicKind: CalendarTopicKind;
  readonly topic: string | null;
  readonly notes: string | null;
  readonly status: CalendarStatus;
  readonly projectId: string | null;
  readonly aiGenerated: boolean;
}

interface CalendarMonthDTO {
  readonly monthDate: string;
  readonly entries: ReadonlyArray<CalendarMonthEntryDTO>;
  readonly mood: Mood | null;
  readonly toneHint: string | null;
}

interface DaySuggestionDTO {
  readonly date: string;
  readonly entry: CalendarMonthEntryDTO | null;
  readonly smartTiming: { hour: number; reason: string } | null;
  readonly mood: Mood | null;
}

const SMART_TIMING_PLATFORMS: ReadonlySet<string> = new Set([
  'instagram',
  'tiktok',
  'facebook',
  'wa_status',
  'linkedin',
]);

function pickPlatform(channel: string): SmartTimingPlatform | null {
  return SMART_TIMING_PLATFORMS.has(channel) ? (channel as SmartTimingPlatform) : null;
}

function readTopicKind(meta: unknown): CalendarTopicKind {
  if (meta && typeof meta === 'object' && 'topic_kind' in meta) {
    const v = (meta as { topic_kind?: unknown }).topic_kind;
    if (
      v === 'marca' ||
      v === 'propiedad' ||
      v === 'zona' ||
      v === 'remarketing' ||
      v === 'email'
    ) {
      return v;
    }
  }
  return 'propiedad';
}

function readMood(meta: unknown): Mood | null {
  if (meta && typeof meta === 'object' && 'mood' in meta) {
    const v = (meta as { mood?: unknown }).mood;
    if (v === 'low' || v === 'neutral' || v === 'high' || v === 'celebratory') return v;
  }
  return null;
}

export const studioCalendarRouter = router({
  getMonth: studioProcedure
    .input(monthDateInput)
    .query(async ({ ctx, input }): Promise<CalendarMonthDTO> => {
      const supabase = createAdminClient();
      const monthEnd = lastDayOfMonth(input.monthDate);
      const { data, error } = await supabase
        .from('studio_content_calendar')
        .select(
          'id, scheduled_for, scheduled_time, channel, content_type, status, project_id, ai_generated, topic, notes, meta',
        )
        .eq('user_id', ctx.user.id)
        .gte('scheduled_for', input.monthDate)
        .lte('scheduled_for', monthEnd)
        .order('scheduled_for', { ascending: true });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      }
      const entries: CalendarMonthEntryDTO[] = (data ?? []).map((row) => ({
        id: row.id,
        scheduledFor: row.scheduled_for,
        scheduledTime: row.scheduled_time,
        channel: row.channel as CalendarChannel,
        contentType: row.content_type as CalendarContentType,
        topicKind: readTopicKind(row.meta),
        topic: row.topic,
        notes: row.notes,
        status: row.status as CalendarStatus,
        projectId: row.project_id,
        aiGenerated: row.ai_generated,
      }));
      const firstMood = entries.length > 0 ? readMood((data ?? [])[0]?.meta) : null;
      let toneHint: string | null = null;
      if (data && data.length > 0) {
        const meta = data[0]?.meta;
        if (meta && typeof meta === 'object' && 'tone_hint' in meta) {
          const v = (meta as { tone_hint?: unknown }).tone_hint;
          if (typeof v === 'string') toneHint = v;
        }
      }
      return {
        monthDate: input.monthDate,
        entries,
        mood: firstMood,
        toneHint,
      };
    }),

  generateMonth: studioProcedure.input(monthDateInput).mutation(async ({ ctx, input }) => {
    try {
      const result = await generateMonthlyCalendar({
        userId: ctx.user.id,
        monthDate: input.monthDate,
      });
      return result;
    } catch (error) {
      sentry.captureException(error, { tags: { feature: 'studio-calendar-generate-month' } });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'calendar generation failed',
        cause: error,
      });
    }
  }),

  getDaySuggestion: studioProcedure
    .input(dateInput)
    .query(async ({ ctx, input }): Promise<DaySuggestionDTO> => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_content_calendar')
        .select(
          'id, scheduled_for, scheduled_time, channel, content_type, status, project_id, ai_generated, topic, notes, meta',
        )
        .eq('user_id', ctx.user.id)
        .eq('scheduled_for', input.date)
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      }
      if (!data) {
        return { date: input.date, entry: null, smartTiming: null, mood: null };
      }
      const platform = pickPlatform(data.channel);
      const [year, month, day] = input.date.split('-').map(Number);
      const dow = year && month && day ? new Date(Date.UTC(year, month - 1, day)).getUTCDay() : 1;
      const timing = platform ? getOptimalTiming(platform, dow) : null;
      const entry: CalendarMonthEntryDTO = {
        id: data.id,
        scheduledFor: data.scheduled_for,
        scheduledTime: data.scheduled_time,
        channel: data.channel as CalendarChannel,
        contentType: data.content_type as CalendarContentType,
        topicKind: readTopicKind(data.meta),
        topic: data.topic,
        notes: data.notes,
        status: data.status as CalendarStatus,
        projectId: data.project_id,
        aiGenerated: data.ai_generated,
      };
      return {
        date: input.date,
        entry,
        smartTiming: timing ? { hour: timing.hour, reason: timing.reason } : null,
        mood: readMood(data.meta),
      };
    }),

  markAsGenerated: studioProcedure.input(markGeneratedInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: existing, error: fetchErr } = await supabase
      .from('studio_content_calendar')
      .select('id, user_id')
      .eq('id', input.entryId)
      .maybeSingle();
    if (fetchErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: fetchErr });
    }
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'calendar entry not found' });
    }
    if (existing.user_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const { error: updateErr } = await supabase
      .from('studio_content_calendar')
      .update({
        status: 'published',
        project_id: input.projectId,
      })
      .eq('id', input.entryId);
    if (updateErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updateErr });
    }
    return { ok: true as const, entryId: input.entryId, projectId: input.projectId };
  }),

  exportICal: exportICalProcedure,

  // Mood preview helper (sin persistencia) — usado por UI antes de generar mes.
  previewMood: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const now = new Date();
    const iso7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const iso30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [closed7, closed30, leads7] = await Promise.all([
      supabase
        .from('operaciones')
        .select('id', { count: 'exact', head: true })
        .eq('asesor_id', ctx.user.id)
        .gte('closed_at', iso7d),
      supabase
        .from('operaciones')
        .select('id', { count: 'exact', head: true })
        .eq('asesor_id', ctx.user.id)
        .gte('closed_at', iso30d),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_asesor_id', ctx.user.id)
        .gte('created_at', iso7d),
    ]);
    return detectMood({
      closedDeals7d: closed7.count ?? 0,
      closedDeals30d: closed30.count ?? 0,
      leads7d: leads7.count ?? 0,
    });
  }),
});
