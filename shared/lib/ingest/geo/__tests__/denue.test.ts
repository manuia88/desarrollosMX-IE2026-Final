import { describe, expect, it, vi } from 'vitest';
import {
  DENUE_BASE,
  DENUE_ESTADO_CVE,
  type DenueApiRow,
  denueDriver,
  fetchDenueEntidad,
  parseDenuePayload,
  parseDenuePoint,
  parseDenueScian,
} from '../denue';

const sampleRow: DenueApiRow = {
  CLEE: '12345678901234567890123456789012',
  Id: '123',
  Nombre: 'Nombre comercial',
  Razon_social: 'Razon Social SA de CV',
  Clase_actividad: '461110 — Comercio al por menor en tiendas de abarrotes',
  Estrato: '0 a 5 personas',
  Tipo_vialidad: 'CALLE',
  Calle: 'Avenida Reforma',
  Num_Exterior: '123',
  Num_Interior: 'A',
  Colonia: 'Centro',
  CP: '06000',
  Ubicacion: 'Ciudad de México, Cuauhtémoc, Centro',
  Telefono: '5551234567',
  Correo_e: '',
  Sitio_internet: '',
  Tipo: 'Fijo',
  Longitud: '-99.133208',
  Latitud: '19.432608',
  CentroComercial: '',
  TipoCentroComercial: '',
  NumLocal: '',
  Fecha_Alta: '2020-12',
};

describe('parseDenuePoint', () => {
  it('parsea lat/lng válidos dentro de MX', () => {
    const p = parseDenuePoint('19.432608', '-99.133208');
    expect(p).not.toBeNull();
    expect(p?.lat).toBeCloseTo(19.432608);
    expect(p?.lng).toBeCloseTo(-99.133208);
  });

  it('rechaza lat no-numérica', () => {
    expect(parseDenuePoint('abc', '-99.13')).toBeNull();
    expect(parseDenuePoint('', '-99.13')).toBeNull();
  });

  it('rechaza lat fuera de rango -90/90', () => {
    expect(parseDenuePoint('91.0', '-99.13')).toBeNull();
    expect(parseDenuePoint('-91.0', '-99.13')).toBeNull();
  });

  it('rechaza lng fuera de rango -180/180', () => {
    expect(parseDenuePoint('19.43', '181.0')).toBeNull();
    expect(parseDenuePoint('19.43', '-181.0')).toBeNull();
  });

  it('rechaza null/undefined', () => {
    expect(parseDenuePoint(null, '-99.13')).toBeNull();
    expect(parseDenuePoint('19.43', null)).toBeNull();
    expect(parseDenuePoint(undefined, undefined)).toBeNull();
  });
});

describe('parseDenueScian', () => {
  it('extrae 6 dígitos iniciales de Clase_actividad', () => {
    expect(parseDenueScian('461110 — Comercio al por menor en tiendas')).toBe('461110');
    expect(parseDenueScian('722511 Restaurantes')).toBe('722511');
  });

  it('rechaza cadenas sin prefijo numérico de 6 dígitos', () => {
    expect(parseDenueScian('Comercio general sin codigo')).toBeNull();
    expect(parseDenueScian('46111 Comercio')).toBeNull(); // 5 dígitos
    expect(parseDenueScian('4611101 Comercio')).toBeNull(); // 7 dígitos
  });

  it('rechaza alfanuméricos', () => {
    expect(parseDenueScian('46A110 — Mix')).toBeNull();
    expect(parseDenueScian('ABC123 — Texto')).toBeNull();
  });

  it('rechaza null/undefined/vacío', () => {
    expect(parseDenueScian(null)).toBeNull();
    expect(parseDenueScian(undefined)).toBeNull();
    expect(parseDenueScian('')).toBeNull();
    expect(parseDenueScian('   ')).toBeNull();
  });
});

describe('parseDenuePayload', () => {
  it('mapea rows válidos con todos los campos', () => {
    const rows = parseDenuePayload([sampleRow]);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r?.source_id).toBe(sampleRow.CLEE);
    expect(r?.entity_type).toBe('commercial_establishment');
    expect(r?.name).toBe('Razon Social SA de CV');
    expect(r?.scian_code).toBe('461110');
    expect(r?.lat).toBeCloseTo(19.432608);
    expect(r?.lng).toBeCloseTo(-99.133208);
    expect(r?.h3_r8).toMatch(/^[0-9a-f]{15}$/);
    expect(r?.meta.scian_code).toBe('461110');
    expect(r?.meta.clase_actividad_raw).toBe(sampleRow.Clase_actividad);
    expect(r?.meta.estrato).toBe('0 a 5 personas');
    expect(r?.meta.cp).toBe('06000');
    expect(r?.meta.razon_social).toBe('Razon Social SA de CV');
    expect(r?.meta.fecha_alta).toBe('2020-12');
    expect(r?.meta.giro).toBe('Ciudad de México, Cuauhtémoc, Centro');
  });

  it('filtra rows sin lat/lng válidos', () => {
    const bad: DenueApiRow = {
      ...sampleRow,
      CLEE: 'AAAA',
      Latitud: 'xxx',
      Longitud: '-99.1',
    };
    const rows = parseDenuePayload([sampleRow, bad]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source_id).toBe(sampleRow.CLEE);
  });

  it('filtra rows sin CLEE', () => {
    const noClee = { ...sampleRow, CLEE: '' };
    const rows = parseDenuePayload([noClee as DenueApiRow]);
    expect(rows).toHaveLength(0);
  });

  it('filtra puntos fuera de MX bbox', () => {
    const outOfMx: DenueApiRow = {
      ...sampleRow,
      CLEE: 'OUT1',
      Latitud: '40.0', // NYC approx
      Longitud: '-74.0',
    };
    const rows = parseDenuePayload([outOfMx]);
    expect(rows).toHaveLength(0);
  });

  it('fallback name a Nombre si no hay Razon_social', () => {
    const noRazon: DenueApiRow = { ...sampleRow, CLEE: 'NORZ', Razon_social: '' };
    const rows = parseDenuePayload([noRazon]);
    expect(rows[0]?.name).toBe('Nombre comercial');
  });

  it('tolera array vacío o no-array', () => {
    expect(parseDenuePayload([])).toEqual([]);
    expect(parseDenuePayload(null as unknown as DenueApiRow[])).toEqual([]);
    expect(parseDenuePayload(undefined as unknown as DenueApiRow[])).toEqual([]);
  });

  it('giro usa Colonia si Ubicacion vacío', () => {
    const row: DenueApiRow = { ...sampleRow, CLEE: 'GIR1', Ubicacion: '' };
    const rows = parseDenuePayload([row]);
    expect(rows[0]?.meta.giro).toBe('Centro');
  });
});

describe('fetchDenueEntidad', () => {
  it('arma URL correcta con cve_estado y token en path', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [sampleRow],
    })) as unknown as typeof fetch;
    const out = await fetchDenueEntidad('09', 'test-token-abc', {
      runId: '00000000-0000-0000-0000-000000000001',
      fetchImpl: mockFetch,
    });
    expect(out).toHaveLength(1);
    const callArgs = (mockFetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const url = callArgs?.[0] as string;
    expect(url).toBe(`${DENUE_BASE}/09/test-token-abc`);
    const init = callArgs?.[1] as { headers: Record<string, string> };
    expect(init.headers['X-Correlation-Id']).toBe('00000000-0000-0000-0000-000000000001');
    expect(init.headers.Accept).toBe('application/json');
  });

  it('throwea denue_http_<status> en response no-ok', async () => {
    const mockFetch = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    await expect(fetchDenueEntidad('09', 'tok', { fetchImpl: mockFetch })).rejects.toThrow(
      'denue_http_500',
    );
  });

  it('throwea denue_invalid_cve_estado para cve no 2-dígitos', async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    await expect(fetchDenueEntidad('9', 'tok', { fetchImpl: mockFetch })).rejects.toThrow(
      'denue_invalid_cve_estado',
    );
    await expect(fetchDenueEntidad('abc', 'tok', { fetchImpl: mockFetch })).rejects.toThrow(
      'denue_invalid_cve_estado',
    );
  });

  it('throwea denue_missing_token si token vacío', async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    await expect(fetchDenueEntidad('09', '', { fetchImpl: mockFetch })).rejects.toThrow(
      'denue_missing_token',
    );
  });

  it('retorna array vacío si response no es array', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ error: 'no data' }),
    })) as unknown as typeof fetch;
    const out = await fetchDenueEntidad('09', 'tok', { fetchImpl: mockFetch });
    expect(out).toEqual([]);
  });
});

describe('denueDriver', () => {
  it('está registrado con source=denue y category=geo', () => {
    expect(denueDriver.source).toBe('denue');
    expect(denueDriver.category).toBe('geo');
    expect(denueDriver.defaultPeriodicity).toBe('monthly');
  });

  it('fetch throwea si INEGI_TOKEN falta', async () => {
    const orig = process.env.INEGI_TOKEN;
    delete process.env.INEGI_TOKEN;
    await expect(
      denueDriver.fetch(
        {
          runId: 'r',
          source: 'denue',
          countryCode: 'MX',
          samplePercentage: 100,
          triggeredBy: null,
          startedAt: new Date(),
        },
        {},
      ),
    ).rejects.toThrow(/INEGI_TOKEN/);
    if (orig !== undefined) process.env.INEGI_TOKEN = orig;
  });

  it('parse devuelve DenueParsedRow[]', async () => {
    const rows = await denueDriver.parse([sampleRow], {
      runId: 'r',
      source: 'denue',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    });
    expect(rows).toHaveLength(1);
  });
});

describe('DENUE_ESTADO_CVE', () => {
  it('incluye CDMX=09 y estados comunes', () => {
    expect(DENUE_ESTADO_CVE['Ciudad de México']).toBe('09');
    expect(DENUE_ESTADO_CVE.CDMX).toBe('09');
    expect(DENUE_ESTADO_CVE.Jalisco).toBe('14');
    expect(DENUE_ESTADO_CVE['Nuevo León']).toBe('19');
  });
});

// NOTA: ingestDenue NO se testea aquí — requiere supabase admin client
// (createAdminClient) y orchestrator que inserta ingest_runs. Tests
// end-to-end viven en integration tests con Supabase test instance.
