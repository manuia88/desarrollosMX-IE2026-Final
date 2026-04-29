import { describe, expect, it } from 'vitest';
import { type ExportPayload, formatExport } from '..';

const samplePayload: ExportPayload = {
  entity: 'units',
  rangeFrom: '2026-04-01',
  rangeTo: '2026-04-30',
  generatedAt: '2026-04-28T12:00:00.000Z',
  source: 'v_bi_export_developer',
  rows: [
    {
      proyecto_id: 'aaaa-1111',
      proyecto_nombre: 'Roma Norte 12',
      units_total: 80,
      units_available: 12,
      price_min_mxn: 4500000,
      price_max_mxn: 12500000,
    },
    {
      proyecto_id: 'bbbb-2222',
      proyecto_nombre: 'Condesa 34',
      units_total: 40,
      units_available: 6,
      price_min_mxn: 6800000,
      price_max_mxn: 14200000,
    },
  ],
};

describe('FASE 15.H.3 B.5 — BI Export formatters', () => {
  it('CSV produces RFC-4180 header + rows', () => {
    const out = formatExport('csv', samplePayload);
    expect(out.contentType).toMatch(/text\/csv/);
    expect(typeof out.body).toBe('string');
    const csv = out.body as string;
    expect(csv.split('\n')[0]).toContain('proyecto_nombre');
    expect(csv).toContain('Roma Norte 12');
    expect(out.filename).toMatch(/dmx-units-2026-04-28\.csv/);
  });

  it('XLSX produces binary buffer', () => {
    const out = formatExport('xlsx', samplePayload);
    expect(out.contentType).toContain('spreadsheetml');
    expect(out.body).toBeInstanceOf(Uint8Array);
    expect((out.body as Uint8Array).length).toBeGreaterThan(0);
    expect(out.filename).toMatch(/\.xlsx$/);
  });

  it('Power BI emits {schema, data} JSON envelope', () => {
    const out = formatExport('powerbi', samplePayload);
    const json = JSON.parse(out.body as string);
    expect(json.schema.entity).toBe('units');
    expect(json.schema.fields.length).toBeGreaterThan(0);
    expect(json.data).toHaveLength(2);
  });

  it('Tableau emits WDC tables shape', () => {
    const out = formatExport('tableau', samplePayload);
    const json = JSON.parse(out.body as string);
    expect(json.tables[0].id).toBe('dmx_units');
    expect(json.tables[0].columns.length).toBeGreaterThan(0);
    expect(json.tables[0].rows).toHaveLength(2);
  });

  it('Looker Studio emits schema + rows.values', () => {
    const out = formatExport('looker', samplePayload);
    const json = JSON.parse(out.body as string);
    expect(json.schema[0]).toHaveProperty('semantics');
    expect(json.rows[0].values).toBeDefined();
  });

  it('placeholder source still produces a valid envelope', () => {
    const empty: ExportPayload = { ...samplePayload, rows: [], source: 'placeholder' };
    const out = formatExport('csv', empty);
    expect(typeof out.body).toBe('string');
  });
});
