// F14.F.5 Sprint 4 — Tests participateInChallenge.
// Modo A: mocked Supabase chain. Verifica INSERT + increment count + idempotent UNIQUE error.

import { describe, expect, it, vi } from 'vitest';
import { participateInChallenge } from '@/features/dmx-studio/lib/community-challenges';

const CHALLENGE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const PROJECT_ID = '22222222-2222-2222-2222-222222222222';

interface BuildMockOpts {
  insertResult?: { data: unknown; error: unknown };
  selectCount?: number;
}

function buildSupabaseMock(opts: BuildMockOpts = {}) {
  const insertResult = opts.insertResult ?? {
    data: {
      id: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
      challenge_id: CHALLENGE_ID,
      user_id: USER_ID,
      project_id: PROJECT_ID,
      completed_at: null,
      created_at: '2026-04-27T00:00:00.000Z',
    },
    error: null,
  };
  const updateSpy = vi.fn(() => ({
    eq: vi.fn(async () => ({ error: null })),
  }));
  return {
    updateSpy,
    client: {
      from: vi.fn((table: string) => {
        if (table === 'studio_challenge_participations') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => insertResult),
              })),
            })),
          };
        }
        if (table === 'studio_community_challenges') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { participants_count: opts.selectCount ?? 4 },
                  error: null,
                })),
              })),
            })),
            update: updateSpy,
          };
        }
        return {};
      }),
      // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    } as any,
  };
}

describe('participateInChallenge', () => {
  it('INSERTs participation row and increments participants_count', async () => {
    const { client, updateSpy } = buildSupabaseMock({ selectCount: 4 });
    const result = await participateInChallenge(client, CHALLENGE_ID, USER_ID, PROJECT_ID);
    expect(result.challengeId).toBe(CHALLENGE_ID);
    expect(result.userId).toBe(USER_ID);
    expect(result.projectId).toBe(PROJECT_ID);
    expect(result.completedAt).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith({ participants_count: 5 });
  });

  it('throws clear error when UNIQUE conflict (idempotent guard) returns DB error', async () => {
    const { client } = buildSupabaseMock({
      insertResult: {
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      },
    });
    await expect(participateInChallenge(client, CHALLENGE_ID, USER_ID, null)).rejects.toThrow(
      /participateInChallenge insert failed/,
    );
  });
});
