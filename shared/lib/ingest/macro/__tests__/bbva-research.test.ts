import { describe, expect, it, vi } from 'vitest';
import {
  BBVA_SYSTEM_PROMPT,
  type BbvaExtract,
  BbvaExtractSchema,
  bbvaDriver,
  extractBbvaPdf,
  extractRowsFromBbvaExtract,
  type PdfParserImpl,
} from '../bbva-research';

const validExtract: BbvaExtract = {
  report_period: '2026-03',
  forecast_housing_prices_yoy: {
    value: 5.4,
    confidence: 'high',
    source_span: { page: 12, quote: 'forecast 2026 precios vivienda +5.4% YoY' },
  },
  mortgage_rate_forecast: {
    value: 10.25,
    confidence: 'medium',
    source_span: { page: 14, quote: 'tasa hipotecaria proyectada 10.25%' },
  },
  demand_index: {
    value: null,
    confidence: 'low',
    source_span: null,
  },
  metadata: {
    review_required: true,
    missing_reason: 'demand_index no publicado este trimestre',
  },
};

const mockPdfParser: PdfParserImpl = async () => ({
  text: 'BBVA Research — Situación Inmobiliaria México 2026-03. Forecast housing prices...',
  numpages: 20,
});

function mockFetchOk(extract: BbvaExtract): typeof fetch {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(extract) } }],
      usage: { prompt_tokens: 15000, completion_tokens: 800 },
    }),
  })) as unknown as typeof fetch;
}

describe('BBVA_SYSTEM_PROMPT', () => {
  it('enforces Constitutional AI GC-7 rules', () => {
    expect(BBVA_SYSTEM_PROMPT).toContain('NUNCA inventes');
    expect(BBVA_SYSTEM_PROMPT).toContain('source_span');
    expect(BBVA_SYSTEM_PROMPT).toContain('review_required');
  });
});

describe('BbvaExtractSchema', () => {
  it('acepta extract válido con todos los campos', () => {
    const parsed = BbvaExtractSchema.safeParse(validExtract);
    expect(parsed.success).toBe(true);
  });

  it('acepta value=null con source_span=null (campo faltante permitido)', () => {
    const extract = {
      ...validExtract,
      mortgage_rate_forecast: {
        value: null,
        confidence: 'low' as const,
        source_span: null,
      },
    };
    const parsed = BbvaExtractSchema.safeParse(extract);
    expect(parsed.success).toBe(true);
  });

  it('RECHAZA value!=null con source_span=null (bloquea alucinación)', () => {
    const hallucinated = {
      ...validExtract,
      forecast_housing_prices_yoy: {
        value: 42,
        confidence: 'high' as const,
        source_span: null,
      },
    };
    const parsed = BbvaExtractSchema.safeParse(hallucinated);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const msg = JSON.stringify(parsed.error.issues);
      expect(msg).toContain('value_requires_source_span');
    }
  });

  it('rechaza report_period con formato inválido', () => {
    const bad = { ...validExtract, report_period: '2026/03' };
    expect(BbvaExtractSchema.safeParse(bad).success).toBe(false);
  });

  it('rechaza confidence fuera del enum', () => {
    const bad = {
      ...validExtract,
      demand_index: {
        value: null,
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid enum
        confidence: 'certain' as any,
        source_span: null,
      },
    };
    expect(BbvaExtractSchema.safeParse(bad).success).toBe(false);
  });
});

describe('extractBbvaPdf', () => {
  it('retorna parsed cuando fetch devuelve JSON conforme schema', async () => {
    const out = await extractBbvaPdf(Buffer.from('pdf-bytes'), {
      apiKey: 'sk-test',
      fetchImpl: mockFetchOk(validExtract),
      pdfParserImpl: mockPdfParser,
    });
    expect(out.report_period).toBe('2026-03');
    expect(out.forecast_housing_prices_yoy.value).toBe(5.4);
    expect(out.demand_index.value).toBeNull();
  });

  it('acepta extract con source_span=null en campos value=null', async () => {
    const extract: BbvaExtract = {
      ...validExtract,
      mortgage_rate_forecast: {
        value: null,
        confidence: 'low',
        source_span: null,
      },
    };
    const out = await extractBbvaPdf(Buffer.from('pdf'), {
      apiKey: 'sk-test',
      fetchImpl: mockFetchOk(extract),
      pdfParserImpl: mockPdfParser,
    });
    expect(out.mortgage_rate_forecast.value).toBeNull();
    expect(out.mortgage_rate_forecast.source_span).toBeNull();
  });

  it('throwea bbva_llm_validation_failed cuando LLM alucina (value sin source_span)', async () => {
    const hallucinated = {
      ...validExtract,
      forecast_housing_prices_yoy: {
        value: 99,
        confidence: 'high',
        source_span: null,
      },
    };
    await expect(
      extractBbvaPdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        fetchImpl: mockFetchOk(hallucinated as unknown as BbvaExtract),
        pdfParserImpl: mockPdfParser,
      }),
    ).rejects.toThrow('bbva_llm_validation_failed');
  });

  it('throwea bbva_llm_http_<status> si OpenAI response no-ok', async () => {
    const mockFetch = vi.fn(async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    await expect(
      extractBbvaPdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        fetchImpl: mockFetch,
        pdfParserImpl: mockPdfParser,
      }),
    ).rejects.toThrow('bbva_llm_http_429');
  });

  it('throwea missing_env cuando apiKey no se pasa y no hay env', async () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(
      extractBbvaPdf(Buffer.from('pdf'), {
        pdfParserImpl: mockPdfParser,
      }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
    if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
  });

  it('throwea bbva_pdf_empty_text cuando parser devuelve texto vacío', async () => {
    const emptyParser: PdfParserImpl = async () => ({ text: '', numpages: 0 });
    await expect(
      extractBbvaPdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        pdfParserImpl: emptyParser,
      }),
    ).rejects.toThrow('bbva_pdf_empty_text');
  });

  it('throwea bbva_llm_invalid_json si content no es JSON parseable', async () => {
    const badFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'not json {' } }] }),
    })) as unknown as typeof fetch;
    await expect(
      extractBbvaPdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        fetchImpl: badFetch,
        pdfParserImpl: mockPdfParser,
      }),
    ).rejects.toThrow('bbva_llm_invalid_json');
  });

  it('defaultPdfParser: canonical not_installed error ya no se lanza con pdf-parse instalado', async () => {
    // pdf-parse @ 2.4.5 está en deps (docs/00_FOUNDATION/00.2_STACK). Al pasar
    // bytes que no son un PDF válido, el parser real debe rechazar con el
    // error propio de pdf-parse — NO con el código canónico bbva_pdf_parser_not_installed.
    let err: Error | null = null;
    try {
      await extractBbvaPdf(Buffer.from('not-a-pdf'), {
        apiKey: 'test',
        fetchImpl: mockFetchOk(validExtract),
      });
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err?.message).not.toBe('bbva_pdf_parser_not_installed');
  });

  it('defaultPdfParser: pipeline end-to-end con PDF válido real (pdf-parse + LLM mock)', async () => {
    // Fixture: PDF construido con pdfkit-like bytes mínimo. Prueba que pdf-parse
    // extrae texto > 0 y el pipeline default (sin pdfParserImpl mock) completa.
    const pdfBytes = buildMinimalPdf('BBVA Research Situacion Inmobiliaria 2026');
    const result = await extractBbvaPdf(pdfBytes, {
      apiKey: 'test',
      fetchImpl: mockFetchOk(validExtract),
    });
    expect(result.report_period).toBe('2026-03');
    expect(result.forecast_housing_prices_yoy.value).toBe(5.4);
  });
});

function buildMinimalPdf(text: string): Buffer {
  const safeText = text.replace(/[()\\]/g, (ch) => `\\${ch}`);
  const content = `BT /F1 12 Tf 100 700 Td (${safeText}) Tj ET\n`;
  const contentLen = Buffer.byteLength(content, 'utf8');
  const stream = `<< /Length ${contentLen} >>\nstream\n${content}endstream\n`;

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const objects = [
    '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n',
    '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1/MediaBox[0 0 612 792]>>\nendobj\n',
    '3 0 obj\n<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>\nendobj\n',
    '4 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj\n',
    `5 0 obj\n${stream}endobj\n`,
  ];

  const offsets: number[] = [];
  let cursor = Buffer.byteLength(header, 'binary');
  for (const obj of objects) {
    offsets.push(cursor);
    cursor += Buffer.byteLength(obj, 'binary');
  }
  const xrefOffset = cursor;

  const xrefEntries = offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  const trailer = `xref\n0 6\n0000000000 65535 f \n${xrefEntries}trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(header, 'binary'),
    ...objects.map((o) => Buffer.from(o, 'binary')),
    Buffer.from(trailer, 'binary'),
  ]);
}

describe('extractRowsFromBbvaExtract', () => {
  it('expande 3 metrics → rows con period_start=YYYY-MM-01', () => {
    const rows = extractRowsFromBbvaExtract(validExtract);
    // demand_index es null → solo 2 rows
    expect(rows).toHaveLength(2);
    const names = rows.map((r) => r.metric_name).sort();
    expect(names).toEqual(['forecast_housing_prices_yoy', 'mortgage_rate_forecast']);
    for (const r of rows) {
      expect(r.period_start).toBe('2026-03-01');
      expect(r.period_end).toBe('2026-03-31');
      expect(r.periodicity).toBe('monthly');
    }
  });

  it('incluye source_span (page + quote + confidence + report_period) en cada row', () => {
    const rows = extractRowsFromBbvaExtract(validExtract);
    const r = rows.find((x) => x.metric_name === 'forecast_housing_prices_yoy');
    expect(r?.source_span.page).toBe(12);
    expect(r?.source_span.quote).toContain('5.4%');
    expect(r?.source_span.confidence).toBe('high');
    expect(r?.source_span.report_period).toBe('2026-03');
  });

  it('asigna units canónicos por metric', () => {
    const rows = extractRowsFromBbvaExtract(validExtract);
    const housing = rows.find((r) => r.metric_name === 'forecast_housing_prices_yoy');
    const mortgage = rows.find((r) => r.metric_name === 'mortgage_rate_forecast');
    expect(housing?.unit).toBe('pct_yoy');
    expect(mortgage?.unit).toBe('pct');
  });

  it('omite metrics con value=null', () => {
    const allNull: BbvaExtract = {
      ...validExtract,
      forecast_housing_prices_yoy: { value: null, confidence: 'low', source_span: null },
      mortgage_rate_forecast: { value: null, confidence: 'low', source_span: null },
      demand_index: { value: null, confidence: 'low', source_span: null },
    };
    expect(extractRowsFromBbvaExtract(allNull)).toEqual([]);
  });
});

describe('bbvaDriver', () => {
  it('está registrado con source=bbva_research y category=macro', () => {
    expect(bbvaDriver.source).toBe('bbva_research');
    expect(bbvaDriver.category).toBe('macro');
    expect(bbvaDriver.defaultPeriodicity).toBe('monthly');
  });

  it('fetch throwea cuando no se pasa pdfBuffer', async () => {
    await expect(
      bbvaDriver.fetch(
        {
          runId: 'r',
          source: 'bbva_research',
          countryCode: 'MX',
          samplePercentage: 100,
          triggeredBy: null,
          startedAt: new Date(),
        },
        // biome-ignore lint/suspicious/noExplicitAny: negative test
        { pdfBuffer: undefined as any },
      ),
    ).rejects.toThrow('bbva_missing_pdf_buffer');
  });

  it('parse expande extract → rows', async () => {
    const rows = await bbvaDriver.parse(validExtract, {
      runId: 'r',
      source: 'bbva_research',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    });
    expect(rows).toHaveLength(2);
  });
});
