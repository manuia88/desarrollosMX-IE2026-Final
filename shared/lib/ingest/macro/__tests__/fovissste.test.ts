import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  extractFovisstePdf,
  FOVISSSTE_ENTIDAD_CVE,
  FOVISSSTE_METRIC_UNITS,
  FOVISSSTE_SYSTEM_PROMPT,
  type FovisssteExtract,
  FovisssteExtractSchema,
  fovisssteDriver,
  type PdfParserImpl,
  parseFovisssteQuarter,
  parseFovisssteWorkbook,
} from '../fovissste';

function buildXlsxBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const aoa: Array<Array<string | number | null>> = [
    ['Informe trimestral FOVISSSTE', null, null, null, null, null],
    [null, null, null, null, null, null],
    [
      'periodo',
      'entidad',
      'creditos_otorgados',
      'monto_mdp',
      'vsm_promedio',
      'valor_vivienda_promedio',
    ],
    ['2026-T1', 'Nacional', 12345, 5600.75, 142.5, 890000],
    ['2026-T1', 'Ciudad de México', 2100, 1450.2, 180.3, 1250000],
    ['2026-T1', 'Jalisco', 1800, 980.5, 135.0, 780000],
    ['2026-T1', 'Nuevo León', 1650, 1020.4, 'N/D', 910000],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, sheet, 'Trimestre');
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown;
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}

const validPdfExtract: FovisssteExtract = {
  report_period: '2026-T1',
  creditos_otorgados_nacional: {
    value: 12345,
    confidence: 'high',
    source_span: { page: 5, quote: 'Total de créditos otorgados: 12,345' },
  },
  monto_mdp_nacional: {
    value: 5600.75,
    confidence: 'high',
    source_span: { page: 5, quote: 'Monto ejercido: 5,600.75 mdp' },
  },
  vsm_promedio: {
    value: 142.5,
    confidence: 'medium',
    source_span: { page: 7, quote: 'VSM promedio de 142.5 veces' },
  },
  valor_vivienda_promedio: {
    value: null,
    confidence: 'low',
    source_span: null,
  },
  metadata: {
    review_required: true,
    missing_reason: 'valor_vivienda_promedio no publicado este trimestre',
  },
};

const mockPdfParser: PdfParserImpl = async () => ({
  text: 'FOVISSSTE — Informe trimestral 2026-T1. Créditos otorgados, monto, VSM...',
  numpages: 30,
});

function mockFetchOk(extract: FovisssteExtract): typeof fetch {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(extract) } }],
      usage: { prompt_tokens: 14000, completion_tokens: 700 },
    }),
  })) as unknown as typeof fetch;
}

describe('FOVISSSTE_SYSTEM_PROMPT', () => {
  it('enforces Constitutional AI GC-7 rules (never hallucinate + source_span obligatorio)', () => {
    expect(FOVISSSTE_SYSTEM_PROMPT).toContain('NUNCA inventes');
    expect(FOVISSSTE_SYSTEM_PROMPT).toContain('source_span');
    expect(FOVISSSTE_SYSTEM_PROMPT).toContain('review_required');
    expect(FOVISSSTE_SYSTEM_PROMPT).toContain('VSM');
  });
});

describe('FOVISSSTE_ENTIDAD_CVE', () => {
  it('cubre nacional + 32 entidades con CVE único', () => {
    expect(FOVISSSTE_ENTIDAD_CVE.Nacional).toBe('00');
    expect(FOVISSSTE_ENTIDAD_CVE.Jalisco).toBe('14');
    expect(FOVISSSTE_ENTIDAD_CVE['Nuevo León']).toBe('19');
    expect(FOVISSSTE_ENTIDAD_CVE.CDMX).toBe('09');
    const cves = new Set(Object.values(FOVISSSTE_ENTIDAD_CVE));
    // 33 valores únicos: 00 nacional + 01..32
    expect(cves.size).toBe(33);
  });
});

describe('FOVISSSTE_METRIC_UNITS', () => {
  it('asigna unidades canónicas por métrica', () => {
    expect(FOVISSSTE_METRIC_UNITS.creditos_otorgados).toBe('count');
    expect(FOVISSSTE_METRIC_UNITS.monto_mdp).toBe('mxn_mdp');
    expect(FOVISSSTE_METRIC_UNITS.vsm_promedio).toBe('vsm');
    expect(FOVISSSTE_METRIC_UNITS.valor_vivienda_promedio).toBe('mxn');
  });
});

describe('parseFovisssteQuarter', () => {
  it('acepta formato YYYY-TN', () => {
    const p = parseFovisssteQuarter('2026-T1');
    expect(p?.period_start).toBe('2026-01-01');
    expect(p?.period_end).toBe('2026-03-31');
  });

  it('acepta formato YYYY/QN', () => {
    const p = parseFovisssteQuarter('2026/Q2');
    expect(p?.period_start).toBe('2026-04-01');
    expect(p?.period_end).toBe('2026-06-30');
  });

  it('acepta formato YYYY/0N con cero a la izquierda', () => {
    const p = parseFovisssteQuarter('2026/03');
    expect(p?.period_start).toBe('2026-07-01');
    expect(p?.period_end).toBe('2026-09-30');
  });

  it('calcula Q4 correctamente (oct-dic)', () => {
    const p = parseFovisssteQuarter('2026-T4');
    expect(p?.period_start).toBe('2026-10-01');
    expect(p?.period_end).toBe('2026-12-31');
  });

  it('regresa null para formatos inválidos', () => {
    expect(parseFovisssteQuarter('')).toBeNull();
    expect(parseFovisssteQuarter('2026-T5')).toBeNull();
    expect(parseFovisssteQuarter('2026-T0')).toBeNull();
    expect(parseFovisssteQuarter('abc')).toBeNull();
    expect(parseFovisssteQuarter('2026')).toBeNull();
    // @ts-expect-error negative test
    expect(parseFovisssteQuarter(null)).toBeNull();
  });
});

describe('FovisssteExtractSchema', () => {
  it('acepta extract válido', () => {
    expect(FovisssteExtractSchema.safeParse(validPdfExtract).success).toBe(true);
  });

  it('RECHAZA value!=null con source_span=null (bloquea alucinación GC-7)', () => {
    const hallucinated = {
      ...validPdfExtract,
      creditos_otorgados_nacional: {
        value: 99999,
        confidence: 'high' as const,
        source_span: null,
      },
    };
    const parsed = FovisssteExtractSchema.safeParse(hallucinated);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const msg = JSON.stringify(parsed.error.issues);
      expect(msg).toContain('value_requires_source_span');
    }
  });

  it('acepta value=null + source_span=null (campo faltante)', () => {
    const extract = {
      ...validPdfExtract,
      monto_mdp_nacional: {
        value: null,
        confidence: 'low' as const,
        source_span: null,
      },
    };
    expect(FovisssteExtractSchema.safeParse(extract).success).toBe(true);
  });

  it('rechaza report_period con formato YYYY-MM (debe ser YYYY-TT)', () => {
    const bad = { ...validPdfExtract, report_period: '2026-03' };
    expect(FovisssteExtractSchema.safeParse(bad).success).toBe(false);
  });
});

describe('parseFovisssteWorkbook', () => {
  it('extrae rows de 4 métricas × 4 entidades con periodo YYYY-TT', () => {
    const buf = buildXlsxBuffer();
    const rows = parseFovisssteWorkbook(buf);
    // Nacional: 4 + CDMX: 4 + Jalisco: 4 + NL: 3 (vsm N/D descartado) = 15
    expect(rows.length).toBe(15);
    for (const r of rows) {
      expect(r.periodicity).toBe('quarterly');
      expect(r.period_start).toBe('2026-01-01');
      expect(r.period_end).toBe('2026-03-31');
    }
  });

  it('asigna series_id = metric_nacional para entidad Nacional', () => {
    const buf = buildXlsxBuffer();
    const rows = parseFovisssteWorkbook(buf);
    const credNacional = rows.find((r) => r.series_id === 'creditos_otorgados_nacional');
    expect(credNacional?.value).toBe(12345);
    expect(credNacional?.unit).toBe('count');
  });

  it('asigna series_id = metric_<cve> para entidades (CDMX=09, Jalisco=14)', () => {
    const buf = buildXlsxBuffer();
    const rows = parseFovisssteWorkbook(buf);
    const cdmxMonto = rows.find((r) => r.series_id === 'monto_mdp_09');
    expect(cdmxMonto?.value).toBe(1450.2);
    expect(cdmxMonto?.unit).toBe('mxn_mdp');

    const jalVsm = rows.find((r) => r.series_id === 'vsm_promedio_14');
    expect(jalVsm?.value).toBe(135.0);
    expect(jalVsm?.unit).toBe('vsm');
  });

  it('omite valores N/D (Nuevo León vsm_promedio)', () => {
    const buf = buildXlsxBuffer();
    const rows = parseFovisssteWorkbook(buf);
    const nlVsm = rows.find((r) => r.series_id === 'vsm_promedio_19');
    expect(nlVsm).toBeUndefined();
    // Pero las otras 3 métricas de NL sí están
    const nlCred = rows.find((r) => r.series_id === 'creditos_otorgados_19');
    expect(nlCred?.value).toBe(1650);
  });

  it('preserva source_span con kind=sheet_row y metadata raw', () => {
    const buf = buildXlsxBuffer();
    const rows = parseFovisssteWorkbook(buf);
    const first = rows[0];
    expect(first).toBeDefined();
    if (first?.source_span.kind === 'sheet_row') {
      expect(first.source_span.raw_sheet).toBe('Trimestre');
      expect(typeof first.source_span.raw_row).toBe('number');
      expect(first.source_span.report_period).toBe('2026-T1');
      expect(first.source_span.entidad.length).toBeGreaterThan(0);
    } else {
      throw new Error('expected kind=sheet_row for XLSX path');
    }
  });

  it('buffer vacío → []', () => {
    expect(parseFovisssteWorkbook(Buffer.alloc(0))).toEqual([]);
  });
});

describe('extractFovisstePdf', () => {
  it('retorna parsed cuando fetch devuelve JSON conforme schema', async () => {
    const out = await extractFovisstePdf(Buffer.from('pdf-bytes'), {
      apiKey: 'sk-test',
      fetchImpl: mockFetchOk(validPdfExtract),
      pdfParserImpl: mockPdfParser,
    });
    expect(out.report_period).toBe('2026-T1');
    expect(out.creditos_otorgados_nacional.value).toBe(12345);
    expect(out.valor_vivienda_promedio.value).toBeNull();
  });

  it('throwea fovissste_llm_validation_failed cuando LLM alucina (value sin source_span)', async () => {
    const hallucinated = {
      ...validPdfExtract,
      creditos_otorgados_nacional: {
        value: 99999,
        confidence: 'high',
        source_span: null,
      },
    };
    await expect(
      extractFovisstePdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        fetchImpl: mockFetchOk(hallucinated as unknown as FovisssteExtract),
        pdfParserImpl: mockPdfParser,
      }),
    ).rejects.toThrow('fovissste_llm_validation_failed');
  });

  it('throwea fovissste_llm_http_<status> si OpenAI response no-ok', async () => {
    const mockFetch = vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(
      extractFovisstePdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        fetchImpl: mockFetch,
        pdfParserImpl: mockPdfParser,
      }),
    ).rejects.toThrow('fovissste_llm_http_503');
  });

  it('throwea missing_env cuando apiKey ausente', async () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(
      extractFovisstePdf(Buffer.from('pdf'), { pdfParserImpl: mockPdfParser }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
    if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
  });

  it('throwea fovissste_pdf_empty_text cuando parser devuelve texto vacío', async () => {
    const emptyParser: PdfParserImpl = async () => ({ text: '', numpages: 0 });
    await expect(
      extractFovisstePdf(Buffer.from('pdf'), {
        apiKey: 'sk-test',
        pdfParserImpl: emptyParser,
      }),
    ).rejects.toThrow('fovissste_pdf_empty_text');
  });

  it.skip('integración real con pdf-parse — skipped (paquete no instalado en H1)', async () => {
    // Cuando pdf-parse se agregue al stack, desblockear y probar contra fixture.
  });
});

describe('fovisssteDriver', () => {
  it('está registrado con source=fovissste, category=macro, periodicity=quarterly', () => {
    expect(fovisssteDriver.source).toBe('fovissste');
    expect(fovisssteDriver.category).toBe('macro');
    expect(fovisssteDriver.defaultPeriodicity).toBe('quarterly');
  });

  it('fetch dispatches kind=xlsx → parser SheetJS (rows array)', async () => {
    const buf = buildXlsxBuffer();
    const ctx = {
      runId: 'r',
      source: 'fovissste',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const payload = await fovisssteDriver.fetch(ctx, { kind: 'xlsx', buffer: buf });
    expect(payload.kind).toBe('xlsx');
    if (payload.kind === 'xlsx') {
      expect(Array.isArray(payload.rows)).toBe(true);
      expect(payload.rows.length).toBeGreaterThan(0);
    }
  });

  it('fetch dispatches kind=pdf → extractFovisstePdf (via injected fetch + parser)', async () => {
    // Para probar el dispatch PDF path sin romper process.env, inyectamos a
    // través del driver fetch directamente vía un wrapper: extractFovisstePdf
    // consulta process.env.OPENAI_API_KEY. Seteamos temporal.
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test';
    // Mock global fetch temporal.
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetchOk(validPdfExtract);
    // pdf-parse no instalado → inyectamos vía monkey-patch del default parser:
    // el driver llama extractFovisstePdf sin options.pdfParserImpl, por lo
    // que caerá en defaultPdfParser y throwará. Este test verifica que el
    // dispatch tipa correcto; confirmamos el error canónico.
    const ctx = {
      runId: 'r',
      source: 'fovissste',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(
      fovisssteDriver.fetch(ctx, { kind: 'pdf', buffer: Buffer.from('pdf-bytes') }),
    ).rejects.toThrow('fovissste_pdf_parser_not_installed');
    globalThis.fetch = origFetch;
    if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
    else delete process.env.OPENAI_API_KEY;
  });

  it('fetch rechaza buffer ausente', async () => {
    const ctx = {
      runId: 'r',
      source: 'fovissste',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(
      fovisssteDriver.fetch(ctx, { kind: 'xlsx', buffer: Buffer.alloc(0) }),
    ).rejects.toThrow('fovissste_missing_buffer');
  });

  it('parse (xlsx payload) devuelve las rows directamente', async () => {
    const buf = buildXlsxBuffer();
    const ctx = {
      runId: 'r',
      source: 'fovissste',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const payload = await fovisssteDriver.fetch(ctx, { kind: 'xlsx', buffer: buf });
    const rows = await fovisssteDriver.parse(payload, ctx);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('parse (pdf payload) expande extract → rows con kind=page_quote', async () => {
    const ctx = {
      runId: 'r',
      source: 'fovissste',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    // Construimos un payload PDF manualmente (sin pasar por fetch).
    const rows = (await fovisssteDriver.parse(
      { kind: 'pdf', extract: validPdfExtract },
      ctx,
    )) as Array<{
      metric_name: string;
      series_id: string;
      period_start: string;
      period_end: string;
      value: number;
      source_span: { kind: string };
    }>;
    // 3 métricas válidas (valor_vivienda_promedio es null)
    expect(rows.length).toBe(3);
    expect(rows.every((r) => r.period_start === '2026-01-01')).toBe(true);
    expect(rows.every((r) => r.period_end === '2026-03-31')).toBe(true);
    expect(rows.every((r) => r.source_span.kind === 'page_quote')).toBe(true);
  });
});
