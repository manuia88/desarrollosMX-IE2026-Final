import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/shared/lib/openai/embeddings', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/openai/embeddings')>(
    '@/shared/lib/openai/embeddings',
  );
  return {
    ...actual,
    generateEmbeddings: vi.fn(),
  };
});

import { generateEmbeddings } from '@/shared/lib/openai/embeddings';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  chunkExtractedData,
  generateAndPersistEmbeddings,
} from '../lib/embeddings-engine';

const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockGenerateEmbeddings = vi.mocked(generateEmbeddings);

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
}

function buildSupabaseMock(
  options: {
    deleteError?: { message: string } | null;
    insertError?: { message: string } | null;
  } = {},
): MockSupabase {
  const deleteEq = vi.fn().mockResolvedValue({ error: options.deleteError ?? null });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });
  const insertFn = vi.fn().mockResolvedValue({ error: options.insertError ?? null });
  const from = vi.fn().mockReturnValue({ delete: deleteFn, insert: insertFn });
  return { from, delete: deleteFn, insert: insertFn } as unknown as MockSupabase;
}

describe('embeddings-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'sk_test_stub';
  });

  describe('chunkExtractedData', () => {
    it('returns single chunk for short data', () => {
      const chunks = chunkExtractedData({
        extractedData: { foo: 'bar' },
        docType: 'lista_precios',
        fileName: 'lp.pdf',
      });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toContain('lista_precios');
      expect(chunks[0]).toContain('lp.pdf');
    });

    it('chunks long data with overlap', () => {
      const longArray = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        descripcion: 'Lorem ipsum '.repeat(20),
      }));
      const chunks = chunkExtractedData({
        extractedData: { unidades: longArray },
        docType: 'lista_precios',
        fileName: 'big.pdf',
      });
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.length).toBeLessThanOrEqual(CHUNK_SIZE);
      }
      // Verify overlap exists between consecutive chunks
      if (chunks.length >= 2) {
        const a = chunks[0] as string;
        const b = chunks[1] as string;
        const aTail = a.slice(-CHUNK_OVERLAP);
        expect(b.startsWith(aTail)).toBe(true);
      }
    });
  });

  describe('generateAndPersistEmbeddings', () => {
    it('chunks → batch embeddings → inserts N rows', async () => {
      const supa = buildSupabaseMock();
      mockCreateAdminClient.mockReturnValue(supa as never);
      mockGenerateEmbeddings.mockResolvedValue({
        embeddings: [Array(1536).fill(0.1)],
        telemetry: {
          tokens_used: 50,
          cost_usd: 0.000001,
          model: 'text-embedding-3-small',
          stub: true,
        },
      });

      const result = await generateAndPersistEmbeddings({
        jobId: '00000000-0000-0000-0000-000000000001',
        desarrolladoraId: '00000000-0000-0000-0000-000000000002',
        proyectoId: '00000000-0000-0000-0000-000000000003',
        visibility: 'dev_only',
        extractedData: { foo: 'bar' },
        docType: 'lista_precios',
        fileName: 'lp.pdf',
      });

      expect(result.chunks_count).toBe(1);
      expect(mockGenerateEmbeddings).toHaveBeenCalledOnce();
      expect(supa.insert).toHaveBeenCalledOnce();
      const insertedRows = supa.insert.mock.calls[0]?.[0] as unknown[];
      expect(Array.isArray(insertedRows)).toBe(true);
      expect(insertedRows).toHaveLength(1);
    });

    it('idempotente: borra embeddings previos por job_id antes de insert', async () => {
      const supa = buildSupabaseMock();
      mockCreateAdminClient.mockReturnValue(supa as never);
      mockGenerateEmbeddings.mockResolvedValue({
        embeddings: [Array(1536).fill(0.2)],
        telemetry: {
          tokens_used: 30,
          cost_usd: 0,
          model: 'text-embedding-3-small-stub',
          stub: true,
        },
      });

      await generateAndPersistEmbeddings({
        jobId: 'job-abc',
        desarrolladoraId: 'dev-xyz',
        proyectoId: null,
        visibility: 'dev_only',
        extractedData: { x: 1 },
        docType: 'predial',
        fileName: 'p.pdf',
      });

      expect(supa.delete).toHaveBeenCalled();
    });
  });
});
