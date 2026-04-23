import { beforeEach, describe, expect, it, vi } from 'vitest';

const authUserMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: authUserMock,
    },
    rpc: rpcMock,
  }),
}));

import { POST } from '../create/route';

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/v1/keys/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authUserMock.mockReset();
  rpcMock.mockReset();
});

describe('POST /api/v1/keys/create', () => {
  it('returns 401 when no session', async () => {
    authUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ name: 'x' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    authUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(makeReq({ scopes: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    authUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const req = new Request('http://localhost/api/v1/keys/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_json');
  });

  it('returns raw_key once on success', async () => {
    authUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpcMock.mockResolvedValue({
      data: [
        {
          api_key_id: '00000000-0000-4000-8000-000000000001',
          raw_key: 'dmx_abcd1234567890',
        },
      ],
      error: null,
    });

    const res = await POST(makeReq({ name: 'My Key', scopes: ['tier:pro'] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.raw_key).toBe('dmx_abcd1234567890');
    expect(body.data.api_key_id).toBe('00000000-0000-4000-8000-000000000001');
    expect(body.data.name).toBe('My Key');
  });

  it('returns 500 when RPC returns no row', async () => {
    authUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpcMock.mockResolvedValue({ data: [], error: null });

    const res = await POST(makeReq({ name: 'Empty' }));
    expect(res.status).toBe(500);
  });
});
