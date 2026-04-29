import { describe, expect, it, vi } from 'vitest';
import { authenticateApiKey, createApiKey } from '../api-keys';

function buildSupabaseForCreate(generatedId = 'key-1') {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'api_keys') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: generatedId,
                  profile_id: 'p1',
                  name: 'Test',
                  key_hash: 'hash',
                  key_prefix: 'dmxe_xxxxxx',
                  scopes: ['scores:read'],
                  created_at: '2026-04-28T00:00:00Z',
                  expires_at: null,
                  revoked_at: null,
                  last_used_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

describe('api-keys helpers', () => {
  it('createApiKey returns plaintext + persisted row', async () => {
    const supabase = buildSupabaseForCreate('k1');
    const result = await createApiKey(supabase as unknown as Parameters<typeof createApiKey>[0], {
      profileId: 'p1',
      name: 'Test',
      scopes: ['scores:read'],
    });
    expect(result.id).toBe('k1');
    expect(result.plaintextKey.startsWith('dmxe_')).toBe(true);
    expect(result.plaintextKey.length).toBeGreaterThan(20);
  });

  it('authenticateApiKey rejects missing Authorization header', async () => {
    const supabase = { from: vi.fn() };
    const result = await authenticateApiKey(
      supabase as unknown as Parameters<typeof authenticateApiKey>[0],
      null,
      'scores:read',
      'scores',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('authenticateApiKey rejects malformed Bearer', async () => {
    const supabase = { from: vi.fn() };
    const result = await authenticateApiKey(
      supabase as unknown as Parameters<typeof authenticateApiKey>[0],
      'Bearer not-a-dmx-key',
      'scores:read',
      'scores',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });
});
