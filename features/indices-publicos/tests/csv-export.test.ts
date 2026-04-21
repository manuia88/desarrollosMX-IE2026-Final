import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCsvString, escapeCsvCell, exportToCSV } from '../lib/csv-export';

describe('escapeCsvCell', () => {
  it('devuelve string vacío para null / undefined', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('pasa números y strings simples sin wrap', () => {
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell('roma-norte')).toBe('roma-norte');
  });

  it('envuelve en quotes cuando hay coma, newline o quote', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('buildCsvString', () => {
  it('construye CSV con header + body en orden de headers', () => {
    const rows = [
      { scope: 'roma', value: 42, band: 'bueno' },
      { scope: 'condesa', value: 88, band: 'excelente' },
    ];
    const csv = buildCsvString(rows, ['scope', 'value', 'band']);
    expect(csv).toBe(['scope,value,band', 'roma,42,bueno', 'condesa,88,excelente'].join('\r\n'));
  });

  it('escapa cells con caracteres especiales', () => {
    const rows = [{ name: 'Col, onia', note: 'has "quote"' }];
    const csv = buildCsvString(rows, ['name', 'note']);
    expect(csv).toContain('"Col, onia"');
    expect(csv).toContain('"has ""quote"""');
  });

  it('valores ausentes devuelven string vacío en la celda', () => {
    const rows = [{ a: 1 }];
    const csv = buildCsvString(rows, ['a', 'b']);
    expect(csv).toBe('a,b\r\n1,');
  });

  it('handle empty rows (solo header)', () => {
    const csv = buildCsvString([], ['a', 'b']);
    expect(csv).toBe('a,b');
  });
});

describe('exportToCSV — DOM smoke', () => {
  const originalDocument = globalThis.document;
  const originalUrl = globalThis.URL;
  let createdAnchors: Array<{ href: string; download: string; clicked: boolean }> = [];

  beforeEach(() => {
    createdAnchors = [];
    const createElement = vi.fn((tag: string) => {
      const anchor = {
        tagName: tag.toUpperCase(),
        href: '',
        download: '',
        style: {} as Record<string, string>,
        clicked: false,
        click() {
          this.clicked = true;
        },
      };
      createdAnchors.push(anchor as unknown as (typeof createdAnchors)[number]);
      return anchor;
    });
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    (globalThis as unknown as { document: unknown }).document = {
      createElement,
      body: { appendChild, removeChild },
    };
    (globalThis as unknown as { URL: unknown }).URL = {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    };
    (globalThis as unknown as { Blob: unknown }).Blob =
      (globalThis as unknown as { Blob: unknown }).Blob ??
      class MockBlob {
        constructor(
          public parts: unknown[],
          public opts: unknown,
        ) {}
      };
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    (globalThis as unknown as { URL: unknown }).URL = originalUrl;
  });

  it('crea anchor con download filename .csv', () => {
    exportToCSV([{ a: 1 }], ['a'], 'dmx-pro');
    expect(createdAnchors.length).toBe(1);
    expect(createdAnchors[0]?.download).toBe('dmx-pro.csv');
    expect(createdAnchors[0]?.clicked).toBe(true);
  });

  it('respeta extensión .csv si ya viene en filename', () => {
    exportToCSV([{ a: 1 }], ['a'], 'report.csv');
    expect(createdAnchors[0]?.download).toBe('report.csv');
  });

  it('no rompe cuando document es undefined', () => {
    (globalThis as unknown as { document: unknown }).document = undefined;
    expect(() => exportToCSV([{ a: 1 }], ['a'], 'x')).not.toThrow();
  });
});
