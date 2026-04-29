import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/features/document-intel/lib/anthropic-client', () => ({
  runReasoningChat: vi.fn(),
}));

import { runReasoningChat } from '@/features/document-intel/lib/anthropic-client';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { runComplianceCheck } from '../lib/compliance-check';

const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockRunReasoningChat = vi.mocked(runReasoningChat);

interface JobsRow {
  id: string;
  doc_type: string;
  status: string;
  created_at: string;
}

interface ExtractionsRow {
  id: string;
  job_id: string;
  extracted_data: Record<string, unknown>;
  extraction_version: number;
  created_at: string;
}

function buildSupabase(opts: {
  jobs?: JobsRow[];
  extractions?: ExtractionsRow[];
  insertError?: { message: string } | null;
}): {
  from: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  const insertFn = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });

  const deleteResolve = { error: null };
  const deleteIn = vi.fn().mockResolvedValue(deleteResolve);
  const deleteIsNull = vi.fn().mockReturnValue({ in: deleteIn });
  const deleteEq2 = vi.fn().mockReturnValue({ is: deleteIsNull });
  const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq1 });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'document_jobs') {
      const orderBuilder = {
        order: vi.fn().mockResolvedValue({ data: opts.jobs ?? [], error: null }),
      };
      const inBuilder = vi.fn().mockReturnValue(orderBuilder);
      const eq2 = vi.fn().mockReturnValue({ in: inBuilder });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      return { select };
    }
    if (table === 'document_extractions') {
      const orderBuilder = vi.fn().mockResolvedValue({ data: opts.extractions ?? [], error: null });
      const inFn = vi.fn().mockReturnValue({ order: orderBuilder });
      const select = vi.fn().mockReturnValue({ in: inFn });
      return { select };
    }
    if (table === 'document_compliance_checks') {
      return { delete: deleteFn, insert: insertFn };
    }
    return {};
  });

  return { from, insert: insertFn, delete: deleteFn };
}

describe('runComplianceCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips si <2 docs extraídos', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildSupabase({
        jobs: [
          {
            id: 'j1',
            doc_type: 'lista_precios',
            status: 'extracted',
            created_at: '2026-01-01',
          },
        ],
        extractions: [
          {
            id: 'e1',
            job_id: 'j1',
            extracted_data: {},
            extraction_version: 1,
            created_at: '2026-01-01',
          },
        ],
      }) as never,
    );

    const result = await runComplianceCheck({
      proyectoId: '00000000-0000-0000-0000-000000000010',
      desarrolladoraId: '00000000-0000-0000-0000-000000000020',
    });

    expect(result.skipped).toBe(true);
    expect(result.findings_count).toBe(0);
  });

  it('detecta findings, llama AI reasoning, persiste rows e idempotente', async () => {
    const supa = buildSupabase({
      jobs: [
        {
          id: 'j1',
          doc_type: 'permiso_seduvi',
          status: 'extracted',
          created_at: '2026-01-01',
        },
        {
          id: 'j2',
          doc_type: 'lista_precios',
          status: 'extracted',
          created_at: '2026-01-02',
        },
      ],
      extractions: [
        {
          id: 'e1',
          job_id: 'j1',
          extracted_data: { total_unidades: 50 },
          extraction_version: 1,
          created_at: '2026-01-01',
        },
        {
          id: 'e2',
          job_id: 'j2',
          extracted_data: {
            unidades: Array.from({ length: 60 }, (_, i) => ({ id: i })),
          },
          extraction_version: 1,
          created_at: '2026-01-02',
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(supa as never);
    mockRunReasoningChat.mockResolvedValue({
      text: 'Recomendación AI: revisa coherencia entre permiso y LP.',
      telemetry: {
        tokens_input: 100,
        tokens_output: 30,
        cost_usd: 0.001,
        model: 'claude-sonnet-4-20250514',
      },
    });

    const result = await runComplianceCheck({
      proyectoId: '00000000-0000-0000-0000-000000000010',
      desarrolladoraId: '00000000-0000-0000-0000-000000000020',
    });

    expect(result.skipped).toBe(false);
    expect(result.findings_count).toBeGreaterThan(0);
    expect(result.ai_calls_count).toBeGreaterThan(0);
    expect(supa.delete).toHaveBeenCalled();
    expect(supa.insert).toHaveBeenCalled();
    const rowsArg = supa.insert.mock.calls[0]?.[0] as ReadonlyArray<Record<string, unknown>>;
    expect(Array.isArray(rowsArg)).toBe(true);
    expect(rowsArg.length).toBe(result.findings_count);
    const ccUnidades = rowsArg.find((r) => r.check_code === 'CC_UNIDADES_COUNT');
    expect(ccUnidades).toBeDefined();
    expect(ccUnidades?.severity).toBe('critical');
    expect(ccUnidades?.ai_recommendation).toContain('Recomendación AI');
  });

  it('no llama AI ni inserta si no hay findings', async () => {
    const supa = buildSupabase({
      jobs: [
        {
          id: 'j1',
          doc_type: 'permiso_seduvi',
          status: 'extracted',
          created_at: '2026-01-01',
        },
        {
          id: 'j2',
          doc_type: 'lista_precios',
          status: 'extracted',
          created_at: '2026-01-02',
        },
      ],
      extractions: [
        {
          id: 'e1',
          job_id: 'j1',
          extracted_data: { total_unidades: 50 },
          extraction_version: 1,
          created_at: '2026-01-01',
        },
        {
          id: 'e2',
          job_id: 'j2',
          extracted_data: {
            unidades: Array.from({ length: 50 }, (_, i) => ({ id: i })),
          },
          extraction_version: 1,
          created_at: '2026-01-02',
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(supa as never);

    const result = await runComplianceCheck({
      proyectoId: '00000000-0000-0000-0000-000000000010',
      desarrolladoraId: '00000000-0000-0000-0000-000000000020',
    });

    expect(result.findings_count).toBe(0);
    expect(mockRunReasoningChat).not.toHaveBeenCalled();
    expect(supa.insert).not.toHaveBeenCalled();
  });
});
