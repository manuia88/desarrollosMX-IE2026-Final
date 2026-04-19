import { describe, expect, it } from 'vitest';
import { ALLOWED_SOURCES, assertAllowedSource, assertAllowedUrl } from '../allowlist';
import {
  recordFailure as breakerRecordFailure,
  recordSuccess as breakerRecordSuccess,
  checkCircuit,
  resetCircuit,
} from '../circuit-breaker';
import { geomToH3R8, pointToH3R8 } from '../h3';
import {
  duplicateDetectionGate,
  geoValidityGateMx,
  outlierFlagGate,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import { exponentialBackoff, withRetry } from '../retry';
import { applySample, getDefaultSamplePercentage } from '../sampler';
import type { IngestCtx } from '../types';
import { CircuitOpenError, SourceNotAllowedError } from '../types';

const ctx: IngestCtx = {
  runId: '00000000-0000-0000-0000-000000000001',
  source: 'banxico',
  countryCode: 'MX',
  samplePercentage: 100,
  triggeredBy: null,
  startedAt: new Date(),
};

describe('allowlist', () => {
  it('contiene 35+ sources autorizadas (MACRO + GEO + MARKET)', () => {
    expect(ALLOWED_SOURCES.length).toBeGreaterThanOrEqual(35);
  });

  it('rechaza Habi', () => {
    expect(() => assertAllowedSource('habi')).toThrow(SourceNotAllowedError);
  });

  it('rechaza scraping server-side de portales', () => {
    expect(() => assertAllowedSource('inmuebles24')).toThrow(SourceNotAllowedError);
    expect(() => assertAllowedSource('vivanuncios')).toThrow(SourceNotAllowedError);
    expect(() => assertAllowedUrl('https://apiv2.habi.co/get_lot')).toThrow(SourceNotAllowedError);
    expect(() => assertAllowedUrl('https://www.inmuebles24.com/listing/123')).toThrow(
      SourceNotAllowedError,
    );
  });

  it('acepta sources Chrome ext y APIs oficiales', () => {
    expect(() => assertAllowedSource('chrome_ext_inmuebles24')).not.toThrow();
    expect(() => assertAllowedSource('banxico')).not.toThrow();
    expect(() => assertAllowedSource('google_trends')).not.toThrow();
  });
});

describe('sampler', () => {
  it('respeta percentage = 100 (no filtra)', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    expect(applySample(rows, 100, (r) => String(r.id))).toHaveLength(100);
  });

  it('respeta percentage = 0 (filtra todo)', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    expect(applySample(rows, 0, (r) => String(r.id))).toHaveLength(0);
  });

  it('determinismo: misma row siempre mismo bucket', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const a = applySample(rows, 10, (r) => String(r.id));
    const b = applySample(rows, 10, (r) => String(r.id));
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });

  it('distribución ~uniforme con sample=10%', () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => ({ id: i }));
    const sampled = applySample(rows, 10, (r) => String(r.id));
    expect(sampled.length).toBeGreaterThan(900);
    expect(sampled.length).toBeLessThan(1100);
  });

  it('default percentage cae 100 en prod / 1 en dev', () => {
    const orig = process.env.NODE_ENV;
    const origVal = process.env.SAMPLE_PERCENTAGE;
    delete process.env.SAMPLE_PERCENTAGE;
    Object.assign(process.env, { NODE_ENV: 'production' });
    expect(getDefaultSamplePercentage()).toBe(100);
    Object.assign(process.env, { NODE_ENV: 'development' });
    expect(getDefaultSamplePercentage()).toBe(1);
    Object.assign(process.env, { NODE_ENV: orig ?? 'test' });
    if (origVal !== undefined) process.env.SAMPLE_PERCENTAGE = origVal;
  });
});

describe('retry', () => {
  it('exponentialBackoff respeta cap', () => {
    const v = exponentialBackoff(20, { baseMs: 1000, capMs: 5000, jitter: 0 });
    expect(v).toBeLessThanOrEqual(5000);
  });

  it('withRetry reintenta hasta tener éxito', async () => {
    let count = 0;
    const result = await withRetry(
      async () => {
        count++;
        if (count < 3) throw new Error('transient');
        return 'ok';
      },
      { retries: 5, baseMs: 1, capMs: 1, jitter: 0 },
    );
    expect(result).toBe('ok');
    expect(count).toBe(3);
  });

  it('withRetry respeta shouldRetry=false', async () => {
    let count = 0;
    await expect(
      withRetry(
        async () => {
          count++;
          throw new Error('permanent');
        },
        { retries: 5, shouldRetry: () => false, baseMs: 1, capMs: 1, jitter: 0 },
      ),
    ).rejects.toThrow('permanent');
    expect(count).toBe(1);
  });
});

describe('quality-gates', () => {
  it('rowCountSanity rechaza count = 0', async () => {
    const gate = rowCountSanityGate({ min: 0 });
    const r = await gate.check([], ctx);
    expect(r.ok).toBe(false);
  });

  it('rowCountSanity rechaza explosión > 10× last', async () => {
    const gate = rowCountSanityGate({ lastSuccessfulCount: 100 });
    const rows = Array.from({ length: 1500 });
    const r = await gate.check(rows, ctx);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('explosion');
  });

  it('geoValidityGateMx rechaza > 10% fuera de bbox', async () => {
    const gate = geoValidityGateMx<{ lat: number; lng: number }>();
    const rows = [
      { lat: 19.4, lng: -99.1 },
      { lat: 19.4, lng: -99.1 },
      { lat: 50, lng: 0 },
      { lat: 50, lng: 0 },
    ];
    const r = await gate.check(rows, ctx);
    expect(r.ok).toBe(false);
  });

  it('duplicateDetection rechaza > 50% duplicados', async () => {
    const gate = duplicateDetectionGate<{ id: number }>((r) => String(r.id));
    const rows = [{ id: 1 }, { id: 1 }, { id: 1 }, { id: 1 }, { id: 2 }];
    const r = await gate.check(rows, ctx);
    expect(r.ok).toBe(false);
  });

  it('outlierFlag NO rechaza, solo flagea', async () => {
    const gate = outlierFlagGate<{ v: number }>((r) => r.v);
    const rows = Array.from({ length: 20 }, (_, i) => ({ v: i }));
    rows.push({ v: 10000 });
    const r = await gate.check(rows, ctx);
    expect(r.ok).toBe(true);
    expect(r.meta?.outliers).toBe(1);
  });

  it('runQualityGates agrega failures + warnings', async () => {
    const result = await runQualityGates(
      [{ id: 1 }, { id: 1 }, { id: 1 }, { id: 1 }, { id: 2 }],
      [rowCountSanityGate({ min: 0 }), duplicateDetectionGate<{ id: number }>((r) => String(r.id))],
      ctx,
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.gate === 'duplicate_detection')).toBe(true);
  });
});

describe('h3', () => {
  it('geomToH3R8 retorna string h3', () => {
    const idx = geomToH3R8(19.4326, -99.1332);
    expect(typeof idx).toBe('string');
    expect(idx.length).toBeGreaterThan(8);
  });

  it('pointToH3R8 maneja null/inválidos', () => {
    expect(pointToH3R8(null)).toBeNull();
    expect(pointToH3R8({ lat: Number.NaN, lng: 0 })).toBeNull();
  });
});

describe('circuit-breaker', () => {
  it('abre el circuito tras N failures consecutivos', () => {
    resetCircuit('test_source');
    for (let i = 0; i < 5; i++) breakerRecordFailure('test_source');
    expect(() => checkCircuit('test_source')).toThrow(CircuitOpenError);
    resetCircuit('test_source');
  });

  it('recordSuccess resetea counter', () => {
    resetCircuit('test_source');
    breakerRecordFailure('test_source');
    breakerRecordFailure('test_source');
    breakerRecordSuccess('test_source');
    expect(() => checkCircuit('test_source')).not.toThrow();
    resetCircuit('test_source');
  });
});
