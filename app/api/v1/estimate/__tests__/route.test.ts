import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('botid/server', () => ({
  checkBotId: vi.fn(async () => ({
    isHuman: true,
    isBot: false,
    isVerifiedBot: false,
    bypassed: true,
  })),
}));

vi.mock('@/shared/lib/telemetry/posthog', () => ({
  posthog: { capture: vi.fn() },
}));

// In-memory store por fingerprint para simular tabla avm_estimates.
const CACHE_STORE = new Map<string, Record<string, unknown>>();

function resetStore(): void {
  CACHE_STORE.clear();
}

type ChainResult = { data: unknown; error: null };

function makeFromStub() {
  return (table: string) => {
    if (table !== 'avm_estimates') {
      return {
        select: () => ({
          maybeSingle: async (): Promise<ChainResult> => ({ data: null, error: null }),
        }),
        insert: async (): Promise<ChainResult> => ({ data: null, error: null }),
      };
    }

    return {
      select: (_cols?: string) => {
        const state: { fp?: string } = {};
        const chain = {
          eq: (col: string, value: string) => {
            if (col === 'fingerprint') state.fp = value;
            return chain;
          },
          gt: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async (): Promise<ChainResult> => {
            if (!state.fp) return { data: null, error: null };
            const row = CACHE_STORE.get(state.fp);
            return { data: row ?? null, error: null };
          },
        };
        return chain;
      },
      insert: async (row: Record<string, unknown>): Promise<ChainResult> => {
        const fp = row.fingerprint as string;
        CACHE_STORE.set(fp, {
          ...row,
          created_at: new Date().toISOString(),
        });
        return { data: null, error: null };
      },
    };
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: makeFromStub() }),
}));

import { __resetRateLimit } from '@/shared/lib/intelligence-engine/avm/rate-limit';
import { POST } from '../route';

const VALID_BODY = {
  lat: 19.3854,
  lng: -99.1683,
  sup_m2: 120,
  recamaras: 3,
  banos: 2,
  amenidades: ['alberca', 'gimnasio'],
  estado_conservacion: 'excelente',
  tipo_propiedad: 'depto',
  medio_banos: 1,
  estacionamientos: 2,
  edad_anos: 8,
  piso: 5,
  condiciones: {
    roof_garden: true,
    orientacion: 'S',
    seguridad_interna: true,
  },
};

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/v1/estimate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/estimate', () => {
  beforeEach(() => {
    resetStore();
    __resetRateLimit();
  });

  it('400 si JSON inválido', async () => {
    const req = new Request('http://localhost/api/v1/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_json');
  });

  it('400 si schema inválido (sup_m2 negativo)', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, sup_m2: -10 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_payload');
  });

  it('200 con response shape válido', async () => {
    const res = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '1.1.1.1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.estimate).toBeGreaterThan(0);
    expect(body.ci_low).toBeLessThan(body.estimate);
    expect(body.ci_high).toBeGreaterThan(body.estimate);
    expect(body.confidence_score).toBeGreaterThanOrEqual(0);
    expect(body.confidence_score).toBeLessThanOrEqual(100);
    expect(body.mae_estimated_pct).toBeGreaterThan(0);
    expect(Array.isArray(body.adjustments)).toBe(true);
    expect(body.adjustments.length).toBeGreaterThan(0);
    expect(body.model_version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.endpoint_version).toBe('1.0.0');
    expect(body.cached).toBe(false);
  });

  it('D4 MAE + intervalos de confianza presentes', async () => {
    const res = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '2.2.2.2' }));
    const body = await res.json();
    expect(body.mae_estimated_pct).toBeGreaterThan(0);
    expect(body.ci_low).toBeGreaterThan(0);
    expect(body.ci_high).toBeGreaterThan(body.ci_low);
    expect(body.confidence_score).toBeGreaterThan(0);
  });

  it('D5 adjustments auditables con source/weight/confidence', async () => {
    const res = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '3.3.3.3' }));
    const body = await res.json();
    for (const adj of body.adjustments) {
      expect(adj).toHaveProperty('feature');
      expect(adj).toHaveProperty('value_pct');
      expect(['regression_coefficient', 'comparable_overlay', 'market_context']).toContain(
        adj.source,
      );
      expect(['high', 'medium', 'low']).toContain(adj.confidence);
      expect(adj.explanation_i18n_key).toMatch(/^ie\.avm\.adjustment\./);
    }
  });

  it('D6 counter-estimate: sin comparables → null + flags false', async () => {
    const res = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '4.4.4.4' }));
    const body = await res.json();
    // Sin tabla market_prices_secondary → 0 comparables → estimate_alternative null.
    expect(body.estimate_alternative).toBeNull();
    expect(body.spread_pct).toBeNull();
    expect(body.flag_uncertain).toBe(false);
    expect(body.flag_corroborated).toBe(false);
    expect(body.score_label_key).toBe('ie.avm.label.estimate_corroborated');
  });

  it('D7 cache: mismo fingerprint 2 requests → 2nd cached:true', async () => {
    const first = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '5.5.5.5' }));
    const firstBody = await first.json();
    expect(firstBody.cached).toBe(false);

    const second = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '5.5.5.5' }));
    const secondBody = await second.json();
    expect(secondBody.cached).toBe(true);
    expect(secondBody.estimate).toBe(firstBody.estimate);
  });

  it('free tier: 6to request mismo IP → 429 + upgrade_url', async () => {
    const ip = '6.6.6.6';
    for (let i = 0; i < 5; i += 1) {
      const body = { ...VALID_BODY, sup_m2: 100 + i }; // fingerprint distinto
      const r = await POST(makeRequest(body, { 'x-forwarded-for': ip }));
      expect(r.status).toBe(200);
    }
    const sixth = await POST(
      makeRequest({ ...VALID_BODY, sup_m2: 999 }, { 'x-forwarded-for': ip }),
    );
    expect(sixth.status).toBe(429);
    const body = await sixth.json();
    expect(body.error).toBe('rate_limited');
    expect(body.upgrade_url).toBeDefined();
  });

  it('Pro api_key bypass rate limit ilimitado', async () => {
    const apiKey = 'api_pro_testkey123';
    for (let i = 0; i < 8; i += 1) {
      const body = { ...VALID_BODY, sup_m2: 200 + i };
      const r = await POST(
        makeRequest(body, {
          authorization: `Bearer ${apiKey}`,
          'x-forwarded-for': '7.7.7.7',
        }),
      );
      expect(r.status).toBe(200);
    }
  });

  it('p95 latencia <500ms (con comparables mock y model)', async () => {
    const durations: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const body = { ...VALID_BODY, sup_m2: 80 + i * 5 };
      const t0 = Date.now();
      await POST(makeRequest(body, { 'x-forwarded-for': `8.0.0.${i}` }));
      durations.push(Date.now() - t0);
    }
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    expect(p95).toBeLessThan(500);
  });
});
