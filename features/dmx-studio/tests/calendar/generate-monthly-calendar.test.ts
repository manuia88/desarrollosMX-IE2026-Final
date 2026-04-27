// F14.F.5 Sprint 4 — Tarea 4.1 generateMonthlyCalendar tests (Modo A: mocks).
// Cubre: claude mock returns entries → INSERT studio_content_calendar rows + cost
// tracking (studio_api_jobs INSERT) + mood persisted (studio_ai_coach_sessions) +
// claude error → throw + studio_api_jobs status=failed.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { generateMonthlyCalendar } from '@/features/dmx-studio/lib/calendar';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface RecordedInsert {
  table: string;
  payload: unknown;
  count?: number;
}

interface ChainState {
  table: string;
  filters: Array<{ col: string; val: unknown; op: string }>;
}

interface MockOpts {
  metricsResults?: { closed7: number; closed30: number; leads7: number };
  insertCalendarError?: { message: string };
  insertCalendarCount?: number;
}

function buildMockSupabase(opts: MockOpts = {}): {
  client: AdminClient;
  inserts: RecordedInsert[];
} {
  const inserts: RecordedInsert[] = [];
  const metrics = opts.metricsResults ?? { closed7: 0, closed30: 0, leads7: 0 };
  let metricCallIndex = 0;

  const client = {
    from(table: string) {
      const state: ChainState = { table, filters: [] };

      const queryChain = {
        select(_cols: string, _options?: { count?: 'exact'; head?: boolean }) {
          return queryChain;
        },
        eq(col: string, val: unknown) {
          state.filters.push({ col, val, op: 'eq' });
          return queryChain;
        },
        gte(col: string, val: unknown) {
          state.filters.push({ col, val, op: 'gte' });
          // For metrics queries (count head=true), metrics returns Promise.
          if (state.table === 'operaciones' || state.table === 'leads') {
            const counts = [metrics.closed7, metrics.closed30, metrics.leads7];
            const idx = metricCallIndex;
            metricCallIndex += 1;
            const count = counts[idx] ?? 0;
            return Promise.resolve({ count, error: null, data: null });
          }
          return queryChain;
        },
        lte() {
          return queryChain;
        },
        order() {
          return queryChain;
        },
        limit() {
          return queryChain;
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
      };

      const insertChain = {
        insert(payload: unknown, _options?: { count?: 'exact' }) {
          if (table === 'studio_content_calendar') {
            inserts.push({
              table,
              payload,
              count: opts.insertCalendarCount ?? (Array.isArray(payload) ? payload.length : 1),
            });
            if (opts.insertCalendarError) {
              return Promise.resolve({ error: opts.insertCalendarError, count: 0 });
            }
            return Promise.resolve({
              error: null,
              count: opts.insertCalendarCount ?? (Array.isArray(payload) ? payload.length : 1),
            });
          }
          inserts.push({ table, payload });
          return {
            select() {
              return {
                async single() {
                  return { data: { id: `${table}_id_1` }, error: null };
                },
              };
            },
          };
        },
      };

      return { ...queryChain, ...insertChain };
    },
  } as unknown as AdminClient;

  return { client, inserts };
}

interface MockedClaudeResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function buildMockClaude(response: MockedClaudeResponse) {
  return {
    messages: {
      create: vi.fn(async () => response),
    },
  };
}

const SAMPLE_ENTRIES_JSON = JSON.stringify({
  entries: [
    {
      dayOffset: 0,
      channel: 'instagram',
      contentType: 'reel',
      topicKind: 'propiedad',
      topic: 'Penthouse Polanco 120 m2',
      notes: 'Reel cinematico fachada + sala + cocina + recamara.',
    },
    {
      dayOffset: 3,
      channel: 'tiktok',
      contentType: 'video',
      topicKind: 'zona',
      topic: 'Tour Roma Norte 60s',
      notes: 'Storytelling barrio cafeterias y vida cultural.',
    },
    {
      dayOffset: 7,
      channel: 'wa_status',
      contentType: 'story',
      topicKind: 'marca',
      topic: 'Manu asesor de la semana',
      notes: 'Posicionamiento personal con cierre testimonial.',
    },
  ],
});

describe('generateMonthlyCalendar — happy path', () => {
  it('inserts studio_content_calendar rows + persists studio_api_jobs + mood', async () => {
    const { client, inserts } = buildMockSupabase({
      metricsResults: { closed7: 1, closed30: 3, leads7: 6 },
    });
    const claude = buildMockClaude({
      content: [{ type: 'text', text: SAMPLE_ENTRIES_JSON }],
      usage: { input_tokens: 800, output_tokens: 1200 },
    });

    const result = await generateMonthlyCalendar(
      { userId: 'a1111111-1111-4111-8111-111111111111', monthDate: '2026-05-01' },
      { client, directorClient: claude },
    );

    expect(result.entriesCreated).toBe(3);
    expect(result.mood).toBe('neutral');
    expect(result.costUsd).toBeGreaterThan(0);

    const calendarInsert = inserts.find((i) => i.table === 'studio_content_calendar');
    expect(calendarInsert).toBeDefined();
    expect(Array.isArray(calendarInsert?.payload)).toBe(true);
    const rows = calendarInsert?.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3);
    expect(rows[0]?.scheduled_for).toBe('2026-05-01');
    expect(rows[0]?.channel).toBe('instagram');
    expect(rows[0]?.ai_generated).toBe(true);
    expect(rows[0]?.status).toBe('planned');

    const jobInsert = inserts.find((i) => i.table === 'studio_api_jobs');
    expect(jobInsert).toBeDefined();
    const jobPayload = jobInsert?.payload as Record<string, unknown>;
    expect(jobPayload.job_type).toBe('claude_director');
    expect(jobPayload.provider).toBe('anthropic');
    expect(jobPayload.status).toBe('completed');
    expect(typeof jobPayload.actual_cost_usd).toBe('number');

    const moodInsert = inserts.find((i) => i.table === 'studio_ai_coach_sessions');
    expect(moodInsert).toBeDefined();
    const moodPayload = moodInsert?.payload as Record<string, unknown>;
    expect(moodPayload.mood_detected).toBe('neutral');
  });
});

describe('generateMonthlyCalendar — cost tracking', () => {
  it('cost approx (1000 input + 800 output) / 1M = 0.015 USD with director rates', async () => {
    const { client } = buildMockSupabase();
    const claude = buildMockClaude({
      content: [{ type: 'text', text: SAMPLE_ENTRIES_JSON }],
      usage: { input_tokens: 1000, output_tokens: 800 },
    });
    const result = await generateMonthlyCalendar(
      { userId: 'a2222222-2222-4222-8222-222222222222', monthDate: '2026-06-01' },
      { client, directorClient: claude },
    );
    // (1000*3 + 800*15)/1M = 0.015
    expect(result.costUsd).toBeCloseTo(0.015, 5);
  });
});

describe('generateMonthlyCalendar — claude error path', () => {
  it('throws when claude returns malformed JSON', async () => {
    const { client, inserts } = buildMockSupabase();
    const claude = buildMockClaude({
      content: [{ type: 'text', text: '{not valid json' }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    await expect(
      generateMonthlyCalendar(
        { userId: 'a3333333-3333-4333-8333-333333333333', monthDate: '2026-07-01' },
        { client, directorClient: claude },
      ),
    ).rejects.toThrow();

    // Persisted failure row in studio_api_jobs (canon regla 15).
    const jobInsert = inserts.find((i) => i.table === 'studio_api_jobs');
    expect(jobInsert).toBeDefined();
    const payload = jobInsert?.payload as Record<string, unknown>;
    expect(payload.status).toBe('failed');
    expect(typeof payload.error_message).toBe('string');
  });
});

describe('generateMonthlyCalendar — mood detected from real metrics', () => {
  it('returns "celebratory" mood when closedDeals30d>=5', async () => {
    const { client } = buildMockSupabase({
      metricsResults: { closed7: 3, closed30: 7, leads7: 10 },
    });
    const claude = buildMockClaude({
      content: [{ type: 'text', text: SAMPLE_ENTRIES_JSON }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });
    const result = await generateMonthlyCalendar(
      { userId: 'a4444444-4444-4444-8444-444444444444', monthDate: '2026-08-01' },
      { client, directorClient: claude },
    );
    expect(result.mood).toBe('celebratory');
  });
});
