// F14.F.5 Sprint 4 UPGRADE 5 — Standalone exportICal procedure for PM integration.
// Sub-agent 4 owns this file. Sub-agent 1 owns routes/calendar.ts. PM (or sub-agent 1
// post-merge) imports `exportICalProcedure` and adds it under the calendar router as
// the `exportICal` procedure.
//
// INTEGRATION SNIPPET (PM, in routes/calendar.ts after sub-agent 1 ships):
//
//   import { exportICalProcedure } from '../lib/calendar/ical-procedure';
//
//   export const studioCalendarRouter = router({
//     // ...other procedures owned by sub-agent 1
//     exportICal: exportICalProcedure,
//   });

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from '../../routes/_studio-procedure';
import { generateICalFile, type ICalEntryInput } from './ical-export';

const ExportICalInputSchema = z.object({
  /** Inclusive lower bound, ISO date YYYY-MM-DD. */
  fromDate: z.string().date(),
  /** Inclusive upper bound, ISO date YYYY-MM-DD. */
  toDate: z.string().date(),
});

interface CalendarRow {
  id: string;
  scheduled_for: string; // date
  scheduled_time: string | null; // time HH:MM:SS
  channel: string;
  content_type: string;
  topic: string | null;
  notes: string | null;
}

function combineDateTime(scheduledFor: string, scheduledTime: string | null): string {
  // scheduled_for is YYYY-MM-DD. scheduled_time is HH:MM[:SS] or null → 09:00:00 default.
  const time = scheduledTime ?? '09:00:00';
  const t = time.length === 5 ? `${time}:00` : time;
  return `${scheduledFor}T${t}Z`;
}

function rowToEntry(row: CalendarRow): ICalEntryInput {
  const start = combineDateTime(row.scheduled_for, row.scheduled_time);
  const summary = row.topic
    ? `${row.topic} (${row.content_type} - ${row.channel})`
    : `${row.content_type} - ${row.channel}`;
  return {
    uid: `${row.id}@dmx-studio`,
    start,
    end: null,
    summary,
    description: row.notes ?? null,
    url: null,
    location: null,
  };
}

export const exportICalProcedure = studioProcedure
  .input(ExportICalInputSchema)
  .query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_content_calendar')
      .select('id, scheduled_for, scheduled_time, channel, content_type, topic, notes')
      .eq('user_id', ctx.user.id)
      .gte('scheduled_for', input.fromDate)
      .lte('scheduled_for', input.toDate)
      .order('scheduled_for', { ascending: true });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    const rows = (data ?? []) as CalendarRow[];
    const entries = rows.map(rowToEntry);
    const userEmail = ctx.user.email ?? 'studio@desarrollosmx.com';
    const userName = userEmail.split('@')[0] ?? 'studio';
    const ics = generateICalFile(entries, { name: userName, email: userEmail });

    const filename = `dmx-studio-calendar-${input.fromDate}-${input.toDate}.ics`;
    return {
      filename,
      mimeType: 'text/calendar; charset=utf-8',
      content: ics,
      entryCount: entries.length,
    } as const;
  });
