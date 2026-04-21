// CSV export client-side.
//
// Construye CSV RFC 4180 mínimo (escape quotes, wrap cells con coma/newline/quote)
// y dispara descarga via Blob + <a download>. Pure function `buildCsvString`
// es testeable sin DOM.

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildCsvString(
  rows: ReadonlyArray<Record<string, unknown>>,
  headers: readonly string[],
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const bodyLines = rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(','));
  return [headerLine, ...bodyLines].join('\r\n');
}

export function exportToCSV(
  rows: ReadonlyArray<Record<string, unknown>>,
  headers: readonly string[],
  filename: string,
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const csv = buildCsvString(rows, headers);
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
