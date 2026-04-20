import { describe, expect, it, vi } from 'vitest';
import type { Calculator, CalculatorOutput } from '../base';
import {
  CONFIDENCE_THRESHOLDS,
  composeConfidence,
  detectConfidenceByFreshness,
  detectConfidenceByVolume,
} from '../confidence';
import { runScore, trackExternalCost } from '../run-score';
import { isProvenanceValid } from '../types';

// ============================================================
// Fake SupabaseClient para tests sin DB real.
// Cubre: .from().upsert() → no-error; .rpc() → devuelve data genérico.
// ============================================================
function fakeSupabase(
  options: {
    upsertImpl?: (table: string, row: unknown) => { error: { message: string } | null };
    rpcImpl?: (fn: string, args: unknown) => { data: unknown; error: { message: string } | null };
    trackSpend?: { source: string; cost: number }[];
  } = {},
) {
  const upserts: Array<{ table: string; row: unknown }> = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];

  return {
    upserts,
    rpcCalls,
    client: {
      from(table: string) {
        return {
          upsert: (row: unknown, _opts?: unknown) => {
            upserts.push({ table, row });
            const res = options.upsertImpl?.(table, row);
            return Promise.resolve({ error: res?.error ?? null });
          },
          select: (_q?: string, _opts?: unknown) => ({
            eq: (_col: string, _val: unknown) => ({
              gte: (_c: string, _v: unknown) => Promise.resolve({ count: 0 }),
            }),
          }),
          insert: (row: unknown) => {
            upserts.push({ table, row });
            return Promise.resolve({ error: null });
          },
        };
      },
      rpc(fn: string, args: unknown) {
        rpcCalls.push({ fn, args });
        const res = options.rpcImpl?.(fn, args);
        return Promise.resolve({
          data: res?.data ?? { enqueued: true },
          error: res?.error ?? null,
        });
      },
    },
  };
}

// ============================================================
// 1 — Confidence helpers
// ============================================================
describe('confidence helpers', () => {
  it('detectConfidenceByVolume aplica umbrales DENUE oficiales', () => {
    const t = CONFIDENCE_THRESHOLDS.denue;
    expect(detectConfidenceByVolume(150, t)).toBe('high');
    expect(detectConfidenceByVolume(50, t)).toBe('medium');
    expect(detectConfidenceByVolume(3, t)).toBe('low');
    expect(detectConfidenceByVolume(0, t)).toBe('insufficient_data');
  });

  it('detectConfidenceByFreshness aplica umbrales macro_series', () => {
    expect(detectConfidenceByFreshness(2)).toBe('high');
    expect(detectConfidenceByFreshness(15)).toBe('medium');
    expect(detectConfidenceByFreshness(60)).toBe('low');
    expect(detectConfidenceByFreshness(200)).toBe('insufficient_data');
  });

  it('composeConfidence — el peor manda', () => {
    expect(composeConfidence(['high', 'high', 'medium'])).toBe('medium');
    expect(composeConfidence(['medium', 'low'])).toBe('low');
    expect(composeConfidence(['high', 'insufficient_data'])).toBe('insufficient_data');
    expect(composeConfidence([])).toBe('insufficient_data');
  });
});

// ============================================================
// 2 — Calculator fake: 3 datos → low; 150 datos → high
// ============================================================
function fakeCalculator(scoreId: string, count: number, tier: 1 | 2 | 3 | 4 = 1): Calculator {
  return {
    scoreId,
    version: '0.0.1-test',
    tier,
    run: async (_input, _supabase) => {
      const confidence = detectConfidenceByVolume(count, CONFIDENCE_THRESHOLDS.denue);
      const output: CalculatorOutput = {
        score_value: confidence === 'high' ? 80 : confidence === 'medium' ? 50 : 20,
        score_label: confidence,
        components: { count },
        inputs_used: { count },
        confidence,
        citations: [{ source: 'fake', count }],
        provenance: {
          sources: [{ name: 'fake', count }],
          computed_at: new Date().toISOString(),
          calculator_version: '0.0.1-test',
        },
      };
      return output;
    },
  };
}

describe('calculator framework — confidence by volume', () => {
  it('3 datos → low; 150 datos → high', async () => {
    const sb = fakeSupabase();
    const lowRes = await runScore(
      'F01',
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      {
        calculatorOverride: fakeCalculator('F01', 3),
        skipEnqueueCascade: true,
      },
    );
    expect(lowRes.kind).toBe('ok');
    if (lowRes.kind === 'ok') expect(lowRes.output.confidence).toBe('low');

    const highRes = await runScore(
      'F01',
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      {
        calculatorOverride: fakeCalculator('F01', 150),
        skipEnqueueCascade: true,
      },
    );
    expect(highRes.kind).toBe('ok');
    if (highRes.kind === 'ok') expect(highRes.output.confidence).toBe('high');
  });
});

// ============================================================
// 3 — runScore F01 persiste fila con provenance
// ============================================================
describe('runScore — persistence with provenance', () => {
  it('runScore(F01) persiste una fila en zone_scores con provenance válido', async () => {
    const sb = fakeSupabase();
    const res = await runScore(
      'F01',
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      {
        calculatorOverride: fakeCalculator('F01', 100),
        skipEnqueueCascade: true,
      },
    );
    expect(res.kind).toBe('ok');
    expect(sb.upserts.some((u) => u.table === 'zone_scores')).toBe(true);
    const row = sb.upserts.find((u) => u.table === 'zone_scores')?.row as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(isProvenanceValid(row.provenance)).toBe(true);
    expect(row.score_type).toBe('F01');
    expect(row.zone_id).toBe('zone-1');
  });
});

// ============================================================
// 4 — Tier 2-4 sin data → gated:true sin persistir
// ============================================================
describe('runScore — tier gating', () => {
  it('runScore(E03) tier 4 devuelve gated sin persistir', async () => {
    const sb = fakeSupabase();
    const res = await runScore(
      'E03',
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      {
        calculatorOverride: fakeCalculator('E03', 10, 4),
        skipEnqueueCascade: true,
      },
    );
    expect(res.kind).toBe('gated');
    if (res.kind === 'gated') {
      expect(res.gate.gated).toBe(true);
      expect(res.gate.reason).toBe('tier_insufficient');
    }
    expect(sb.upserts.length).toBe(0);
  });

  it('runScore(A01) tier 2 en MX devuelve gated (inventario insuficiente H1)', async () => {
    const sb = fakeSupabase();
    const res = await runScore(
      'A01',
      { userId: 'user-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      {
        calculatorOverride: fakeCalculator('A01', 50, 2),
        skipEnqueueCascade: true,
      },
    );
    expect(res.kind).toBe('gated');
  });
});

// ============================================================
// 5 — Provenance missing → error explícito (U4 enforcement)
// ============================================================
describe('runScore — U4 provenance enforcement', () => {
  it('calculator sin provenance rechaza con error explícito', async () => {
    const sb = fakeSupabase();
    const brokenCalc: Calculator = {
      scoreId: 'F01',
      version: '0.0.1-broken',
      tier: 1,
      run: async () =>
        ({
          score_value: 80,
          score_label: 'ok',
          components: {},
          inputs_used: {},
          confidence: 'high',
          citations: [],
          provenance: null,
        }) as unknown as CalculatorOutput,
    };
    const res = await runScore(
      'F01',
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      { calculatorOverride: brokenCalc, skipEnqueueCascade: true },
    );
    expect(res.kind).toBe('error');
    if (res.kind === 'error') {
      expect(res.error).toMatch(/provenance_invalid_or_missing/);
    }
    expect(sb.upserts.length).toBe(0);
  });

  it('provenance con sources vacío también rechaza', async () => {
    const sb = fakeSupabase();
    const emptyProvenance: Calculator = {
      scoreId: 'F01',
      version: '0.0.1',
      tier: 1,
      run: async () => ({
        score_value: 50,
        score_label: 'ok',
        components: {},
        inputs_used: {},
        confidence: 'medium',
        citations: [],
        provenance: {
          sources: [],
          computed_at: new Date().toISOString(),
          calculator_version: '0.0.1',
        },
      }),
    };
    const res = await runScore(
      'F01',
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      sb.client as unknown as Parameters<typeof runScore>[2],
      { calculatorOverride: emptyProvenance, skipEnqueueCascade: true },
    );
    expect(res.kind).toBe('error');
  });
});

// ============================================================
// 6 — trackExternalCost escribe en cost_log/api_budgets (U3)
// ============================================================
vi.mock('@/shared/lib/ingest/cost-tracker', () => ({
  recordSpend: vi.fn(),
  preCheckBudget: vi.fn(),
}));

describe('trackExternalCost — U3 cost tracker hookup', () => {
  it('invoca recordSpend del ingest/cost-tracker', async () => {
    const mod = await import('@/shared/lib/ingest/cost-tracker');
    const recordSpend = mod.recordSpend as unknown as ReturnType<typeof vi.fn>;
    recordSpend.mockClear();
    await trackExternalCost('mapbox', 0.005);
    expect(recordSpend).toHaveBeenCalledWith('mapbox', 0.005);
  });

  it('costUsd <= 0 no registra', async () => {
    const mod = await import('@/shared/lib/ingest/cost-tracker');
    const recordSpend = mod.recordSpend as unknown as ReturnType<typeof vi.fn>;
    recordSpend.mockClear();
    await trackExternalCost('mapbox', 0);
    expect(recordSpend).not.toHaveBeenCalled();
  });
});
