// BLOQUE 11.J.7 — Mini SVG sparkline generator para Pulse sections en emails.
//
// Pure stringification SVG — NO PNG, NO libs externas (no chrome-pdf,
// no canvas). Salida es string HTML-safe embebible en <div> de email.
// Normalización de puntos a rango [height-padding, padding] para que todas
// las series pequeñas sean legibles. Sparkline determinista: mismo input →
// misma salida (útil para testing + caching en Cloudflare KV si ever).
//
// Email-safe: usa atributos stroke+fill inline, sin CSS externo. Dimensiones
// default 300×60 caben en un bloque responsive de email client.

export interface SparklineOptions {
  readonly width?: number;
  readonly height?: number;
  readonly stroke?: string; // color polyline
  readonly fill?: string | null; // fill under curve; null desactiva
  readonly strokeWidth?: number;
  readonly paddingY?: number;
  readonly ariaLabel?: string;
}

const DEFAULT_OPTIONS: Required<Omit<SparklineOptions, 'fill' | 'ariaLabel'>> & {
  fill: string | null;
  ariaLabel: string;
} = {
  width: 300,
  height: 60,
  stroke: '#2f7bff',
  fill: 'rgba(47,123,255,0.12)',
  strokeWidth: 2,
  paddingY: 4,
  ariaLabel: 'Tendencia Pulse',
};

function sanitizeFinite(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n);
}

function formatCoord(n: number): string {
  // 2 decimales suficientes para email; evita notation cientifica.
  return Number.parseFloat(n.toFixed(2)).toString();
}

// Normaliza puntos al rango vertical [paddingY, height-paddingY].
// Si todos los puntos son iguales, devuelve línea central.
export function normalizePoints(
  points: readonly number[],
  width: number,
  height: number,
  paddingY: number,
): ReadonlyArray<{ x: number; y: number }> {
  const clean = points.filter(sanitizeFinite);
  if (clean.length === 0) return [];

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min;
  const innerH = Math.max(1, height - paddingY * 2);
  const step = clean.length > 1 ? width / (clean.length - 1) : 0;
  const mid = height / 2;

  return clean.map((v, i) => {
    const x = clean.length === 1 ? width / 2 : step * i;
    if (range === 0) {
      return { x, y: mid };
    }
    const norm = (v - min) / range; // 0..1
    // Invertir Y: valor alto = arriba (y bajo).
    const y = height - paddingY - norm * innerH;
    return { x, y };
  });
}

function buildPolylinePoints(coords: ReadonlyArray<{ x: number; y: number }>): string {
  return coords.map((c) => `${formatCoord(c.x)},${formatCoord(c.y)}`).join(' ');
}

function buildAreaPath(coords: ReadonlyArray<{ x: number; y: number }>, height: number): string {
  if (coords.length === 0) return '';
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last) return '';
  const segments: string[] = [];
  segments.push(`M ${formatCoord(first.x)} ${formatCoord(height)}`);
  for (const c of coords) {
    segments.push(`L ${formatCoord(c.x)} ${formatCoord(c.y)}`);
  }
  segments.push(`L ${formatCoord(last.x)} ${formatCoord(height)}`);
  segments.push('Z');
  return segments.join(' ');
}

export function generatePulseSparklineSVG(
  points: readonly number[],
  options: SparklineOptions = {},
): string {
  const width = options.width ?? DEFAULT_OPTIONS.width;
  const height = options.height ?? DEFAULT_OPTIONS.height;
  const stroke = options.stroke ?? DEFAULT_OPTIONS.stroke;
  const fill = options.fill === null ? null : (options.fill ?? DEFAULT_OPTIONS.fill);
  const strokeWidth = options.strokeWidth ?? DEFAULT_OPTIONS.strokeWidth;
  const paddingY = options.paddingY ?? DEFAULT_OPTIONS.paddingY;
  const ariaLabel = options.ariaLabel ?? DEFAULT_OPTIONS.ariaLabel;

  const coords = normalizePoints(points, width, height, paddingY);
  const polylinePts = buildPolylinePoints(coords);
  const areaPath = fill ? buildAreaPath(coords, height) : '';

  // Header con role=img + aria-label para lectores de email/screen readers.
  const openSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}">`;

  const areaEl =
    fill && areaPath ? `<path d="${areaPath}" fill="${escapeXml(fill)}" stroke="none"/>` : '';

  const polyEl =
    polylinePts.length > 0
      ? `<polyline points="${polylinePts}" fill="none" stroke="${escapeXml(stroke)}" ` +
        `stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`
      : '';

  return `${openSvg}${areaEl}${polyEl}</svg>`;
}

// Minimal XML escape para atributos user-controlled.
export function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
