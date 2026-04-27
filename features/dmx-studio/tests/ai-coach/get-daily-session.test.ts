// F14.F.5 Sprint 4 — Tests getDailyCoachSession.
// Mock Anthropic client (R16: cero credit). Verifica:
// (1) returns existing session si ya hay row para session_date hoy.
// (2) generates new session si no existe → llama claude mocked + INSERT row.

import { describe, expect, it, vi } from 'vitest';
import { getDailyCoachSession } from '@/features/dmx-studio/lib/ai-coach';

const USER_ID = '11111111-1111-1111-1111-111111111111';

interface MockSessionRow {
  id: string;
  user_id: string;
  session_date: string;
  mood_detected: string;
  suggested_action: string;
  user_response: string | null;
  completed: boolean;
  dismissed: boolean;
  created_at: string;
}

interface BuildOpts {
  existing?: MockSessionRow | null;
}

function buildSupabaseMock(opts: BuildOpts = {}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown }> = [];
  const insertedSessionRow: MockSessionRow = {
    id: 'sssssss-ssss-ssss-ssss-sssssssssss1',
    user_id: USER_ID,
    session_date: '2026-04-27',
    mood_detected: 'neutral',
    suggested_action: 'Graba 1 reel hoy mientras tomas tu primer café.',
    user_response: null,
    completed: false,
    dismissed: false,
    created_at: '2026-04-27T00:00:00.000Z',
  };
  return {
    inserts,
    updates,
    client: {
      from(table: string) {
        if (table === 'studio_ai_coach_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: opts.existing ?? null,
                    error: null,
                  })),
                })),
              })),
            })),
            insert: vi.fn((payload: unknown) => {
              inserts.push({ table, payload });
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { ...insertedSessionRow, ...(payload as object) },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        if (table === 'studio_api_jobs') {
          return {
            insert: vi.fn((payload: unknown) => {
              inserts.push({ table, payload });
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { id: 'jjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjj1' },
                    error: null,
                  })),
                })),
              };
            }),
            update: vi.fn((payload: unknown) => {
              updates.push({ table, payload });
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
          };
        }
        return {};
      },
      // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    } as any,
  };
}

const fakeClaudeClient = {
  messages: {
    create: vi.fn(async () => ({
      content: [
        {
          type: 'text' as const,
          text: 'Graba 1 reel hoy mientras tomas tu primer café.',
        },
      ],
    })),
    countTokens: vi.fn(),
  },
  // biome-ignore lint/suspicious/noExplicitAny: minimal anthropic mock
} as any;

describe('getDailyCoachSession', () => {
  it('returns existing session when one already exists for today', async () => {
    const existing: MockSessionRow = {
      id: 'eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      user_id: USER_ID,
      session_date: '2026-04-27',
      mood_detected: 'energized',
      suggested_action: 'Manten el ritmo: agenda 2 reels hoy.',
      user_response: null,
      completed: false,
      dismissed: false,
      created_at: '2026-04-27T00:00:00.000Z',
    };
    const { client, inserts } = buildSupabaseMock({ existing });
    const result = await getDailyCoachSession(client, USER_ID, {
      now: new Date('2026-04-27T12:00:00Z'),
      client: fakeClaudeClient,
    });
    expect(result.id).toBe(existing.id);
    expect(result.suggestedAction).toBe(existing.suggested_action);
    // No insert when existing row found.
    expect(inserts.filter((i) => i.table === 'studio_ai_coach_sessions')).toHaveLength(0);
  });

  it('generates new session when none exists for today (calls claude mock + inserts)', async () => {
    fakeClaudeClient.messages.create.mockClear();
    const { client, inserts } = buildSupabaseMock({ existing: null });
    const result = await getDailyCoachSession(client, USER_ID, {
      now: new Date('2026-04-27T12:00:00Z'),
      client: fakeClaudeClient,
      defaultMood: 'neutral',
    });
    expect(fakeClaudeClient.messages.create).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe(USER_ID);
    expect(result.sessionDate).toBe('2026-04-27');
    expect(result.suggestedAction.length).toBeGreaterThan(0);
    const sessionInserts = inserts.filter((i) => i.table === 'studio_ai_coach_sessions');
    expect(sessionInserts).toHaveLength(1);
    const jobInserts = inserts.filter((i) => i.table === 'studio_api_jobs');
    expect(jobInserts).toHaveLength(1);
  });
});
