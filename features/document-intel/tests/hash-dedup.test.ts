import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  checkDuplicate,
  computePageHashes,
  diffPages,
  recordDocumentHash,
  sha256,
} from '../lib/hash-dedup';

const mockCreateAdminClient = vi.mocked(createAdminClient);

interface MaybeSingleResult {
  data: { job_id: string | null; page_hashes?: unknown } | null;
  error: { message: string } | null;
}

interface SingleResult {
  data: { page_hashes: unknown } | null;
  error: { message: string } | null;
}

interface InsertResult {
  error: { message: string } | null;
}

function buildSelectClient(
  result: MaybeSingleResult | SingleResult,
  mode: 'maybe' | 'single' = 'maybe',
) {
  const eq2 = vi
    .fn()
    .mockReturnValue(
      mode === 'maybe'
        ? { maybeSingle: vi.fn().mockResolvedValue(result) }
        : { single: vi.fn().mockResolvedValue(result) },
    );
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi
    .fn()
    .mockReturnValue(
      mode === 'maybe'
        ? { eq: eq1 }
        : { eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(result) }) },
    );
  const from = vi.fn().mockReturnValue({ select });
  return { from };
}

function buildInsertClient(result: InsertResult) {
  const insert = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ insert });
  return { from, insert };
}

beforeEach(() => {
  mockCreateAdminClient.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('sha256', () => {
  it('produces deterministic hash for same content', () => {
    const buf = Buffer.from('hello world');
    expect(sha256(buf)).toBe(sha256(buf));
  });

  it('produces different hashes for different content', () => {
    expect(sha256(Buffer.from('a'))).not.toBe(sha256(Buffer.from('b')));
  });

  it('accepts ArrayBuffer, Uint8Array, and Buffer', () => {
    const u8 = new Uint8Array([1, 2, 3]);
    const buf = Buffer.from(u8);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    expect(sha256(u8)).toBe(sha256(buf));
    expect(sha256(ab)).toBe(sha256(buf));
  });

  it('matches expected SHA256 for known input', () => {
    const known = sha256(Buffer.from(''));
    expect(known).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('computePageHashes', () => {
  it('falls back to single hash when no pageBuffers', () => {
    const buf = Buffer.from('PDF content');
    const hashes = computePageHashes({ fileBuffer: buf });
    expect(hashes).toHaveLength(1);
    expect(hashes[0]).toBe(sha256(buf));
  });

  it('hashes each page independently when pageBuffers provided', () => {
    const p1 = Buffer.from('page1');
    const p2 = Buffer.from('page2');
    const p3 = Buffer.from('page3');
    const hashes = computePageHashes({
      fileBuffer: Buffer.from('all'),
      pageBuffers: [p1, p2, p3],
    });
    expect(hashes).toHaveLength(3);
    expect(hashes[0]).toBe(sha256(p1));
    expect(hashes[2]).toBe(sha256(p3));
  });
});

describe('checkDuplicate', () => {
  it('returns duplicate true when row exists', async () => {
    const fakeClient = buildSelectClient(
      { data: { job_id: '00000000-0000-0000-0000-000000000abc' }, error: null },
      'maybe',
    );
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const res = await checkDuplicate({
      desarrolladoraId: '00000000-0000-0000-0000-000000000001',
      fileBuffer: Buffer.from('PDF'),
    });
    expect(res.duplicate).toBe(true);
    expect(res.existingJobId).toBe('00000000-0000-0000-0000-000000000abc');
  });

  it('returns duplicate false when row missing', async () => {
    const fakeClient = buildSelectClient({ data: null, error: null }, 'maybe');
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const res = await checkDuplicate({
      desarrolladoraId: '00000000-0000-0000-0000-000000000001',
      fileBuffer: Buffer.from('PDF'),
    });
    expect(res.duplicate).toBe(false);
    expect(res.existingJobId).toBeUndefined();
  });

  it('returns duplicate false when supabase error', async () => {
    const fakeClient = buildSelectClient({ data: null, error: { message: 'boom' } }, 'maybe');
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const res = await checkDuplicate({
      desarrolladoraId: '00000000-0000-0000-0000-000000000001',
      fileBuffer: Buffer.from('PDF'),
    });
    expect(res.duplicate).toBe(false);
  });
});

describe('diffPages', () => {
  it('returns empty array when all pages match', async () => {
    const previous = ['h1', 'h2', 'h3'];
    const fakeClient = buildSelectClient(
      { data: { page_hashes: previous }, error: null },
      'single',
    );
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const changed = await diffPages({
      currentHashes: ['h1', 'h2', 'h3'],
      previousJobId: '00000000-0000-0000-0000-000000000abc',
    });
    expect(changed).toEqual([]);
  });

  it('returns indices of changed pages', async () => {
    const previous = ['h1', 'h2', 'h3'];
    const fakeClient = buildSelectClient(
      { data: { page_hashes: previous }, error: null },
      'single',
    );
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const changed = await diffPages({
      currentHashes: ['h1', 'X', 'h3'],
      previousJobId: '00000000-0000-0000-0000-000000000abc',
    });
    expect(changed).toEqual([1]);
  });

  it('returns all indices when previous record missing', async () => {
    const fakeClient = buildSelectClient({ data: null, error: { message: 'not found' } }, 'single');
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const changed = await diffPages({
      currentHashes: ['h1', 'h2'],
      previousJobId: '00000000-0000-0000-0000-000000000abc',
    });
    expect(changed).toEqual([0, 1]);
  });
});

describe('recordDocumentHash', () => {
  it('returns ok true on successful insert', async () => {
    const fakeClient = buildInsertClient({ error: null });
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const res = await recordDocumentHash({
      desarrolladoraId: '00000000-0000-0000-0000-000000000001',
      jobId: '00000000-0000-0000-0000-000000000abc',
      fileHash: 'deadbeef',
      pageHashes: ['p1', 'p2'],
    });
    expect(res.ok).toBe(true);
    expect(fakeClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        desarrolladora_id: '00000000-0000-0000-0000-000000000001',
        file_hash_sha256: 'deadbeef',
        job_id: '00000000-0000-0000-0000-000000000abc',
        page_hashes: ['p1', 'p2'],
      }),
    );
  });

  it('returns ok false with error message on failure', async () => {
    const fakeClient = buildInsertClient({ error: { message: 'unique_violation' } });
    mockCreateAdminClient.mockReturnValue(
      fakeClient as unknown as ReturnType<typeof createAdminClient>,
    );
    const res = await recordDocumentHash({
      desarrolladoraId: '00000000-0000-0000-0000-000000000001',
      jobId: '00000000-0000-0000-0000-000000000abc',
      fileHash: 'deadbeef',
      pageHashes: [],
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('unique_violation');
  });
});
