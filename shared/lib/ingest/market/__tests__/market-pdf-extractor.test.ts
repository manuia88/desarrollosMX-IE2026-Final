import { describe, expect, it, vi } from 'vitest';
import { CBRE_CONFIG } from '../cbre';
import { CUSHMAN_CONFIG } from '../cushman';
import { JLL_CONFIG } from '../jll';
import {
  buildExtractSchema,
  buildOpenAiJsonSchema,
  extractMarketPdf,
  extractRowsFromMarketExtract,
  MARKET_SYSTEM_PROMPT,
  type MarketPublisherConfig,
  type PdfParserImpl,
} from '../market-pdf-extractor';
import { SOFTEC_CONFIG } from '../softec';
import { TINSA_CONFIG } from '../tinsa';

const CONFIGS = [CUSHMAN_CONFIG, CBRE_CONFIG, TINSA_CONFIG, JLL_CONFIG, SOFTEC_CONFIG];

const mockPdfParser: PdfParserImpl = async () => ({
  text: 'Report trimestral con métricas mercado inmobiliario…',
  numpages: 15,
});

function buildValidExtract(config: MarketPublisherConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {
    report_period: '2026-03',
    metadata: { review_required: false, missing_reason: null },
  };
  for (const [idx, m] of config.metrics.entries()) {
    out[m.name] = {
      value: idx === 0 ? 8.5 : idx * 100,
      confidence: 'high',
      source_span: { page: 4 + idx, quote: `${m.name} = valor extraído literal` },
    };
  }
  return out;
}

function mockFetchOk(extract: Record<string, unknown>): typeof fetch {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(extract) } }],
    }),
  })) as unknown as typeof fetch;
}

describe('MARKET_SYSTEM_PROMPT', () => {
  it('enforces Constitutional AI GC-7 rules', () => {
    expect(MARKET_SYSTEM_PROMPT).toContain('NUNCA inventes');
    expect(MARKET_SYSTEM_PROMPT).toContain('source_span');
    expect(MARKET_SYSTEM_PROMPT).toContain('review_required');
  });
});

describe.each(CONFIGS)('buildExtractSchema($source)', (config) => {
  it('acepta extract válido con todos los campos', () => {
    const schema = buildExtractSchema(config);
    const parsed = schema.safeParse(buildValidExtract(config));
    expect(parsed.success).toBe(true);
  });

  it('acepta value=null con source_span=null', () => {
    const extract = buildValidExtract(config);
    const firstMetric = config.metrics[0];
    if (!firstMetric) throw new Error('config has no metrics');
    extract[firstMetric.name] = { value: null, confidence: 'low', source_span: null };
    expect(buildExtractSchema(config).safeParse(extract).success).toBe(true);
  });

  it('RECHAZA value!=null con source_span=null (bloquea alucinación)', () => {
    const extract = buildValidExtract(config);
    const firstMetric = config.metrics[0];
    if (!firstMetric) throw new Error('config has no metrics');
    extract[firstMetric.name] = { value: 42, confidence: 'high', source_span: null };
    const result = buildExtractSchema(config).safeParse(extract);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain('value_requires_source_span');
    }
  });

  it('rechaza report_period inválido', () => {
    const extract = buildValidExtract(config);
    extract.report_period = '2026/03';
    expect(buildExtractSchema(config).safeParse(extract).success).toBe(false);
  });
});

describe('buildOpenAiJsonSchema', () => {
  it('genera schema strict con todos los metrics requeridos', () => {
    const schema = buildOpenAiJsonSchema(CUSHMAN_CONFIG);
    expect(schema.strict).toBe(true);
    expect(schema.schema.required).toContain('report_period');
    expect(schema.schema.required).toContain('metadata');
    for (const m of CUSHMAN_CONFIG.metrics) {
      expect(schema.schema.required).toContain(m.name);
    }
  });
});

describe.each(CONFIGS)('extractRowsFromMarketExtract($source)', (config) => {
  it('mapea metrics con value no-null a MarketParsedRow', () => {
    const rows = extractRowsFromMarketExtract(buildValidExtract(config), config);
    expect(rows.length).toBe(config.metrics.length);
    for (const r of rows) {
      expect(r.source).toBe(config.source);
      expect(r.period_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.period_end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.source_span.quote.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(r.source_span.confidence);
    }
  });

  it('omite metrics con value=null', () => {
    const extract = buildValidExtract(config);
    const firstMetric = config.metrics[0];
    if (!firstMetric) throw new Error('config has no metrics');
    extract[firstMetric.name] = { value: null, confidence: 'low', source_span: null };
    const rows = extractRowsFromMarketExtract(extract, config);
    expect(rows.length).toBe(config.metrics.length - 1);
    expect(rows.find((r) => r.metric_name === firstMetric.name)).toBeUndefined();
  });
});

describe('extractMarketPdf', () => {
  it('llama OpenAI con response_format json_schema y parsea extract válido', async () => {
    const extract = buildValidExtract(CUSHMAN_CONFIG);
    const fetchMock = mockFetchOk(extract);
    const result = await extractMarketPdf(Buffer.from('dummy'), CUSHMAN_CONFIG, {
      apiKey: 'sk-test',
      pdfParserImpl: mockPdfParser,
      fetchImpl: fetchMock,
    });
    expect(result.report_period).toBe('2026-03');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    if (!call) throw new Error('fetch not called');
    const body = JSON.parse((call[1] as { body: string }).body);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it('lanza missing_env si no hay OPENAI_API_KEY', async () => {
    await expect(
      extractMarketPdf(Buffer.from('x'), CUSHMAN_CONFIG, {
        apiKey: '',
        pdfParserImpl: mockPdfParser,
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).rejects.toThrow('missing_env');
  });

  it('lanza market_llm_validation_failed si LLM devuelve hallucination', async () => {
    const hallucinated = buildValidExtract(CUSHMAN_CONFIG);
    const firstMetric = CUSHMAN_CONFIG.metrics[0];
    if (!firstMetric) throw new Error('config has no metrics');
    hallucinated[firstMetric.name] = { value: 999, confidence: 'high', source_span: null };
    await expect(
      extractMarketPdf(Buffer.from('x'), CUSHMAN_CONFIG, {
        apiKey: 'sk-test',
        pdfParserImpl: mockPdfParser,
        fetchImpl: mockFetchOk(hallucinated),
      }),
    ).rejects.toThrow('market_llm_validation_failed');
  });
});

describe('publisher configs', () => {
  it('todos los sources están en allowlist', async () => {
    const { ALLOWED_SOURCES } = await import('../../allowlist');
    for (const c of CONFIGS) {
      expect(ALLOWED_SOURCES).toContain(c.source);
    }
  });

  it('todos definen al menos 3 métricas', () => {
    for (const c of CONFIGS) {
      expect(c.metrics.length).toBeGreaterThanOrEqual(3);
    }
  });
});
