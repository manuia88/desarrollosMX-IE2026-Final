import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ZoneEntry } from '../../../shared/schemas/zones.ts';
import { zoneEntrySchema } from '../../../shared/schemas/zones.ts';
import {
  DMX_ZONES_NAMESPACE,
  generateZoneId,
  loadAllZonesFromContent,
  topologicalSort,
} from '../lib/zones-loader.ts';

describe('zones-loader — generateZoneId (UUID v5)', () => {
  it('determinismo: 3 llamadas con mismos inputs devuelven el mismo UUID', () => {
    const a = generateZoneId('MX', 'colonia', 'MX-CDMX-BJ-del-valle-centro');
    const b = generateZoneId('MX', 'colonia', 'MX-CDMX-BJ-del-valle-centro');
    const c = generateZoneId('MX', 'colonia', 'MX-CDMX-BJ-del-valle-centro');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('namespace estable: valor exacto para caso canónico hardcoded', () => {
    // Calculado contra namespace DMX_ZONES_NAMESPACE + input
    //   "MX:colonia:MX-CDMX-BJ-del-valle-centro"
    // (RFC 4122 v5 / SHA-1).
    expect(DMX_ZONES_NAMESPACE).toBe('f7e9c4a8-6b2d-4e5f-9a1c-8d3b2e7f6c5a');
    const id = generateZoneId('MX', 'colonia', 'MX-CDMX-BJ-del-valle-centro');
    expect(id).toBe('da026076-e58b-5214-8c18-d420848b05e1');
  });

  it('distinct inputs: cambiar scopeId genera UUID distinto', () => {
    const a = generateZoneId('MX', 'colonia', 'MX-CDMX-BJ-del-valle-centro');
    const b = generateZoneId('MX', 'colonia', 'MX-CDMX-BJ-del-valle-norte');
    expect(a).not.toBe(b);
  });
});

describe('zones-loader — Zod validation via zoneEntrySchema', () => {
  it('acepta entry válido', () => {
    const valid: unknown = {
      scope_type: 'colonia',
      scope_id: 'MX-CDMX-BJ-del-valle-centro',
      country_code: 'MX',
      name_es: 'Del Valle Centro',
      name_en: 'Del Valle Centro',
      name_pt: null,
      parent_scope_id: 'MX-CDMX-BJ',
      lat: 19.3878,
      lng: -99.1661,
      metadata: {
        admin_level: 10,
        data_source: 'manual',
        seed_version: 'v1_h1_cdmx',
      },
    };
    const res = zoneEntrySchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rechaza scope_type fuera del enum', () => {
    const bad: unknown = {
      scope_type: 'planet',
      scope_id: 'FOO',
      country_code: 'MX',
      name_es: 'X',
      name_en: 'X',
      metadata: { admin_level: 4 },
    };
    const res = zoneEntrySchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('rechaza lat > 90', () => {
    const bad: unknown = {
      scope_type: 'colonia',
      scope_id: 'FOO',
      country_code: 'MX',
      name_es: 'X',
      name_en: 'X',
      lat: 120,
      lng: 0,
      metadata: { admin_level: 10 },
    };
    const res = zoneEntrySchema.safeParse(bad);
    expect(res.success).toBe(false);
  });
});

describe('zones-loader — topologicalSort', () => {
  it('ordena por admin_level ascendente (country=2 antes que neighborhood=10)', () => {
    const mixed: ZoneEntry[] = [
      makeEntry({
        scope_type: 'colonia',
        scope_id: 'MX-CDMX-BJ-del-valle',
        admin_level: 10,
      }),
      makeEntry({
        scope_type: 'country',
        scope_id: 'MX',
        admin_level: 2,
      }),
      makeEntry({
        scope_type: 'alcaldia',
        scope_id: 'MX-CDMX-BJ',
        admin_level: 8,
      }),
    ];
    const sorted = topologicalSort(mixed);
    expect(sorted.map((z) => z.metadata.admin_level)).toEqual([2, 8, 10]);
  });

  it('dentro del mismo nivel ordena alfabético por scope_id', () => {
    const same: ZoneEntry[] = [
      makeEntry({ scope_type: 'colonia', scope_id: 'MX-Z', admin_level: 10 }),
      makeEntry({ scope_type: 'colonia', scope_id: 'MX-A', admin_level: 10 }),
      makeEntry({ scope_type: 'colonia', scope_id: 'MX-M', admin_level: 10 }),
    ];
    const sorted = topologicalSort(same);
    expect(sorted.map((z) => z.scope_id)).toEqual(['MX-A', 'MX-M', 'MX-Z']);
  });
});

describe('zones-loader — loadAllZonesFromContent', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zones-loader-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('flattens nested alcaldía + N colonias a (N+1) entries', async () => {
    // Estructura: tmp/country.json + tmp/cdmx/alcaldias/bj.json (nested)
    const country = {
      scope_type: 'country',
      scope_id: 'MX',
      country_code: 'MX',
      name_es: 'México',
      name_en: 'Mexico',
      metadata: { admin_level: 2 },
    };
    await fs.writeFile(path.join(tmpDir, 'country.json'), JSON.stringify(country));

    const alcaldiaDir = path.join(tmpDir, 'cdmx', 'alcaldias');
    await fs.mkdir(alcaldiaDir, { recursive: true });
    const nested = {
      alcaldia: {
        scope_type: 'alcaldia',
        scope_id: 'MX-CDMX-BJ',
        country_code: 'MX',
        name_es: 'Benito Juárez',
        name_en: 'Benito Juarez',
        metadata: { admin_level: 8 },
      },
      colonias: [
        {
          scope_type: 'colonia',
          scope_id: 'MX-CDMX-BJ-c1',
          country_code: 'MX',
          name_es: 'C1',
          name_en: 'C1',
          metadata: { admin_level: 10 },
        },
        {
          scope_type: 'colonia',
          scope_id: 'MX-CDMX-BJ-c2',
          country_code: 'MX',
          name_es: 'C2',
          name_en: 'C2',
          metadata: { admin_level: 10 },
        },
      ],
    };
    await fs.writeFile(path.join(alcaldiaDir, 'bj.json'), JSON.stringify(nested));

    // Fixture: schema.json debe ser IGNORADO por el walker
    await fs.writeFile(path.join(tmpDir, 'schema.json'), JSON.stringify({ $schema: 'ignored' }));

    const all = await loadAllZonesFromContent(tmpDir);

    // 1 country + 1 alcaldía + 2 colonias = 4 entries (schema.json excluido)
    expect(all).toHaveLength(4);

    const scopeIds = all.map((z) => z.scope_id).sort();
    expect(scopeIds).toEqual(['MX', 'MX-CDMX-BJ', 'MX-CDMX-BJ-c1', 'MX-CDMX-BJ-c2']);
  });

  it('single entry file retorna 1 ZoneEntry', async () => {
    const single = {
      scope_type: 'country',
      scope_id: 'MX',
      country_code: 'MX',
      name_es: 'México',
      name_en: 'Mexico',
      metadata: { admin_level: 2 },
    };
    await fs.writeFile(path.join(tmpDir, 'country.json'), JSON.stringify(single));
    const all = await loadAllZonesFromContent(tmpDir);
    expect(all).toHaveLength(1);
    expect(all[0]?.scope_id).toBe('MX');
  });
});

// -------------------- helpers --------------------

function makeEntry(opts: { scope_type: string; scope_id: string; admin_level: number }): ZoneEntry {
  return {
    scope_type: opts.scope_type as ZoneEntry['scope_type'],
    scope_id: opts.scope_id,
    country_code: 'MX',
    name_es: opts.scope_id,
    name_en: opts.scope_id,
    metadata: {
      admin_level: opts.admin_level,
      data_source: 'manual',
      seed_version: 'v1_h1_cdmx',
    },
  };
}
