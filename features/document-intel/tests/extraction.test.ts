// FASE 17.B — Tests extraction-engine + system-prompts + anthropic-client
// Modo A canon: createCaller mocks (CI-fast). Real Anthropic API queda fuera.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

vi.mock('@/features/document-intel/lib/anthropic-client', async () => {
  const mod = await vi.importActual<typeof import('../lib/anthropic-client')>(
    '../lib/anthropic-client',
  );
  return {
    ...mod,
    runExtraction: vi.fn(),
  };
});

import { runExtraction } from '@/features/document-intel/lib/anthropic-client';
import { processJob } from '@/features/document-intel/lib/extraction-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';

function makeFakeJobRow() {
  return {
    id: 'job-1',
    desarrolladora_id: 'dev-1',
    doc_type: 'lista_precios',
    storage_path: 'dev-1/job-1/file.pdf',
    status: 'extracting',
    retry_count: 0,
  };
}

function buildSupabaseStub(jobRow = makeFakeJobRow()) {
  const updateMock = vi.fn();
  const insertExtractionMock = vi.fn();
  const selectExtractionsMock = vi.fn();

  const fromMock = vi.fn((table: string) => {
    if (table === 'document_jobs') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: jobRow, error: null }),
          })),
        })),
        update: vi.fn(() => {
          updateMock();
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        }),
      };
    }
    if (table === 'document_extractions') {
      return {
        select: vi.fn(() => {
          selectExtractionsMock();
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          };
        }),
        insert: vi.fn(() => {
          insertExtractionMock();
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'ext-1' }, error: null }),
            })),
          };
        }),
      };
    }
    if (table === 'dev_ai_credits') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                balance_usd: 10,
                total_consumed_usd: 0,
                total_purchased_usd: 10,
                packs_purchased_count: 1,
              },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'ai_credit_transactions') {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'tx-1' }, error: null }),
          })),
        })),
      };
    }
    return {};
  });

  const downloadMock = vi.fn().mockResolvedValue({
    data: new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }),
    error: null,
  });

  const stub = {
    from: fromMock,
    storage: { from: vi.fn(() => ({ download: downloadMock })) },
  };
  return { stub, updateMock, insertExtractionMock };
}

describe('extraction-engine.processJob — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a lista_precios job end-to-end and updates status=extracted', async () => {
    const { stub, insertExtractionMock } = buildSupabaseStub();
    vi.mocked(createAdminClient).mockReturnValue(stub as never);
    vi.mocked(runExtraction).mockResolvedValue({
      result: {
        extracted_data: { unidades: [], total_unidades: 0 },
        citations: [],
        confidence: 0.9,
      },
      telemetry: {
        tokens_input: 100,
        tokens_output: 50,
        tokens_cache_read: 5000,
        tokens_cache_creation: 0,
        cost_usd: 0.0019,
        model: 'claude-sonnet-4-20250514',
        latency_ms: 1234,
      },
    });

    const outcome = await processJob('job-1');

    expect(outcome.status).toBe('extracted');
    expect(outcome.cost_usd).toBe(0.0019);
    expect(outcome.charged_usd).toBeCloseTo(0.0019 * 1.5, 4);
    expect(insertExtractionMock).toHaveBeenCalled();
  });

  it('returns error outcome when Anthropic call throws', async () => {
    const { stub } = buildSupabaseStub();
    vi.mocked(createAdminClient).mockReturnValue(stub as never);
    vi.mocked(runExtraction).mockRejectedValue(new Error('anthropic_unavailable'));

    const outcome = await processJob('job-1');
    expect(outcome.status).toBe('error');
    expect(outcome.error).toContain('anthropic_unavailable');
  });
});

describe('system-prompts coverage', () => {
  it('returns dedicated prompt for the 5 canonical doc_types', async () => {
    const { getSystemPrompt, isPromptCovered } = await import('../lib/system-prompts');
    const covered = ['lista_precios', 'brochure', 'escritura', 'permiso_seduvi', 'estudio_suelo'] as const;
    for (const dt of covered) {
      expect(isPromptCovered(dt)).toBe(true);
      const p = getSystemPrompt(dt);
      expect(p.length).toBeGreaterThan(500);
      expect(p).toContain('citations');
      expect(p).toContain('NUNCA');
    }
  });

  it('returns fallback prompt for uncovered doc_types', async () => {
    const { getSystemPrompt, isPromptCovered } = await import('../lib/system-prompts');
    expect(isPromptCovered('otro')).toBe(false);
    expect(getSystemPrompt('otro')).toContain('cualquier información');
  });
});

describe('anthropic-client cost calculation', () => {
  it('calculates Sonnet 4 pricing precisely', async () => {
    const { calculateCostUsd } = await import('../lib/anthropic-client');
    const cost = calculateCostUsd({
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: 0,
    });
    // 1000 * 3/1M + 500 * 15/1M + 5000 * 0.30/1M = 0.003 + 0.0075 + 0.0015 = 0.012
    expect(cost).toBeCloseTo(0.012, 5);
  });

  it('handles missing cache token fields', async () => {
    const { calculateCostUsd } = await import('../lib/anthropic-client');
    const cost = calculateCostUsd({
      input_tokens: 1000,
      output_tokens: 500,
    });
    expect(cost).toBeCloseTo(0.003 + 0.0075, 5);
  });
});

describe('schemas — input validation', () => {
  it('createJobInput accepts canonical lista_precios payload', async () => {
    const { createJobInput } = await import('../schemas');
    const r = createJobInput.safeParse({
      doc_type: 'lista_precios',
      storage_path: 'dev1/job1/file.pdf',
      original_filename: 'file.pdf',
      file_size_bytes: 1000,
      mime_type: 'application/pdf',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.visibility).toBe('dev_only');
    }
  });

  it('createJobInput rejects invalid doc_type', async () => {
    const { createJobInput } = await import('../schemas');
    const r = createJobInput.safeParse({
      doc_type: 'made_up_type',
      storage_path: 'x',
      original_filename: 'x.pdf',
      file_size_bytes: 1,
      mime_type: 'application/pdf',
    });
    expect(r.success).toBe(false);
  });

  it('citationSchema validates field+page+snippet shape', async () => {
    const { citationSchema } = await import('../schemas');
    const r = citationSchema.safeParse({
      field: 'precio_min_mxn',
      page: 12,
      paragraph: 5,
      snippet: 'precios desde $8,500,000',
    });
    expect(r.success).toBe(true);
  });
});
