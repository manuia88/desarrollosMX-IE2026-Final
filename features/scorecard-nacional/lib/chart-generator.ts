// BLOQUE 11.I.bis.3 — SVG chart generator para press kit Scorecard Nacional.
//
// Genera SVG stringificado publicable directamente (Twitter/LinkedIn/Instagram
// aceptan SVG vía <img>; medios impresos reciben vector que escala perfecto).
// Sin libs externas — puro string templating.
//
// Nota sobre PNG rasterizado: requiere @napi-rs/canvas (blocker founder).
// SVG cubre publicación web + prensa; PNG raster queda para FASE 22.

import type {
  AlphaLifecycleSummary,
  MagnetExodusRanking,
  MagnetExodusRow,
  PulseHeroMetric,
  ScorecardRankingEntry,
  SustainabilityNationalSection,
} from '../types';

// ---------- Dimensiones por plataforma ----------

export type ChartPlatform = 'twitter' | 'instagram' | 'linkedin';

interface Dimensions {
  readonly width: number;
  readonly height: number;
}

const PLATFORM_DIMENSIONS: Readonly<Record<ChartPlatform, Dimensions>> = {
  twitter: { width: 1200, height: 675 },
  instagram: { width: 1080, height: 1080 },
  linkedin: { width: 1200, height: 627 },
};

// ---------- Tokens visuales (alineados con SCORECARD_PDF_TOKENS) ----------

const COLORS = {
  primary: '#7c3aed',
  accent: '#f59e0b',
  text: '#1e293b',
  muted: '#64748b',
  subtle: '#e2e8f0',
  background: '#ffffff',
  danger: '#dc2626',
  positive: '#16a34a',
  emerging: '#60a5fa',
  alpha: '#7c3aed',
  peaked: '#f59e0b',
  matured: '#16a34a',
  declining: '#dc2626',
} as const;

const FONT_FAMILY = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

// ---------- Types de entrada ----------

export type ChartType =
  | 'pulse-national-trend'
  | 'top-magnets-ranking'
  | 'top-exodus-ranking'
  | 'alpha-lifecycle-sankey'
  | 'sustainability-ids-top10';

export interface PulseTrendPoint {
  readonly period_date: string;
  readonly value: number;
}

export interface PulseNationalTrendData {
  readonly kind: 'pulse-national-trend';
  readonly title: string;
  readonly points: readonly PulseTrendPoint[];
  readonly pulse_current?: PulseHeroMetric | null;
}

export interface MagnetsRankingData {
  readonly kind: 'top-magnets-ranking';
  readonly title: string;
  readonly ranking: MagnetExodusRanking;
}

export interface ExodusRankingData {
  readonly kind: 'top-exodus-ranking';
  readonly title: string;
  readonly ranking: MagnetExodusRanking;
}

export interface AlphaLifecycleChartData {
  readonly kind: 'alpha-lifecycle-sankey';
  readonly title: string;
  readonly summary: AlphaLifecycleSummary;
}

export interface SustainabilityChartData {
  readonly kind: 'sustainability-ids-top10';
  readonly title: string;
  readonly section: SustainabilityNationalSection;
}

export type ChartData =
  | PulseNationalTrendData
  | MagnetsRankingData
  | ExodusRankingData
  | AlphaLifecycleChartData
  | SustainabilityChartData;

export interface RenderChartOptions {
  readonly platform?: ChartPlatform;
  readonly subtitle?: string;
}

// ---------- Utilidades ----------

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatNumber(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(fractionDigits);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface SvgFrame {
  readonly width: number;
  readonly height: number;
  readonly plotX: number;
  readonly plotY: number;
  readonly plotWidth: number;
  readonly plotHeight: number;
  readonly titleHeight: number;
  readonly footerHeight: number;
}

function buildFrame(dims: Dimensions): SvgFrame {
  const titleHeight = 96;
  const footerHeight = 60;
  const plotX = 56;
  const plotY = titleHeight;
  const plotWidth = dims.width - plotX * 2;
  const plotHeight = dims.height - titleHeight - footerHeight;
  return {
    width: dims.width,
    height: dims.height,
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    titleHeight,
    footerHeight,
  };
}

function svgHeader(frame: SvgFrame, title: string, subtitle?: string): string {
  const safeTitle = xmlEscape(title);
  const safeSubtitle = subtitle ? xmlEscape(subtitle) : '';
  return [
    `<rect x="0" y="0" width="${frame.width}" height="${frame.height}" fill="${COLORS.background}"/>`,
    `<text x="${frame.plotX}" y="44" font-family="${FONT_FAMILY}" font-size="28" font-weight="700" fill="${COLORS.text}">${safeTitle}</text>`,
    safeSubtitle
      ? `<text x="${frame.plotX}" y="74" font-family="${FONT_FAMILY}" font-size="16" fill="${COLORS.muted}">${safeSubtitle}</text>`
      : '',
  ].join('');
}

function svgFooter(frame: SvgFrame): string {
  const y = frame.height - 22;
  return `<text x="${frame.plotX}" y="${y}" font-family="${FONT_FAMILY}" font-size="12" fill="${COLORS.muted}">Fuente: DesarrollosMX — Scorecard Nacional</text>`;
}

function svgOpen(frame: SvgFrame): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}" role="img">`;
}

function svgClose(): string {
  return '</svg>';
}

function emptyPlaceholder(frame: SvgFrame, message: string): string {
  const cx = frame.width / 2;
  const cy = frame.plotY + frame.plotHeight / 2;
  return `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="20" fill="${COLORS.muted}">${xmlEscape(message)}</text>`;
}

// ---------- Pulse National Trend (line chart) ----------

function renderPulseTrend(frame: SvgFrame, data: PulseNationalTrendData): string {
  const points = data.points;
  if (points.length === 0) {
    return emptyPlaceholder(frame, 'Datos insuficientes para graficar pulso nacional');
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;
  const padding = range * 0.1;
  const yMin = Math.max(0, min - padding);
  const yMax = Math.min(100, max + padding);
  const yRange = yMax - yMin === 0 ? 1 : yMax - yMin;

  const stepX = points.length > 1 ? frame.plotWidth / (points.length - 1) : 0;
  const coords = points.map((p, idx) => {
    const x = frame.plotX + idx * stepX;
    const normalized = (p.value - yMin) / yRange;
    const y = frame.plotY + frame.plotHeight - normalized * frame.plotHeight;
    return { x, y, label: p.period_date, value: p.value };
  });

  const pathD = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const gridLines: string[] = [];
  for (let i = 0; i <= 4; i += 1) {
    const y = frame.plotY + (frame.plotHeight * i) / 4;
    const labelValue = yMax - (yRange * i) / 4;
    gridLines.push(
      `<line x1="${frame.plotX}" y1="${y}" x2="${frame.plotX + frame.plotWidth}" y2="${y}" stroke="${COLORS.subtle}" stroke-width="1"/>`,
      `<text x="${frame.plotX - 10}" y="${y + 4}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="11" fill="${COLORS.muted}">${formatNumber(labelValue, 0)}</text>`,
    );
  }

  const circles = coords
    .map(
      (c) =>
        `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" fill="${COLORS.primary}"/>`,
    )
    .join('');

  const xLabels = coords
    .filter(
      (_, idx) =>
        idx === 0 || idx === coords.length - 1 || idx % Math.ceil(coords.length / 6) === 0,
    )
    .map(
      (c) =>
        `<text x="${c.x.toFixed(1)}" y="${(frame.plotY + frame.plotHeight + 20).toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="11" fill="${COLORS.muted}">${xmlEscape(c.label)}</text>`,
    )
    .join('');

  const lastPoint = coords[coords.length - 1];
  const firstPoint = coords[0];
  const deltaLabel =
    lastPoint && firstPoint
      ? `Último: ${formatNumber(lastPoint.value, 1)} · Δ vs primer periodo: ${formatNumber(lastPoint.value - firstPoint.value, 2)}`
      : '';

  return [
    gridLines.join(''),
    `<path d="${pathD}" fill="none" stroke="${COLORS.primary}" stroke-width="3"/>`,
    circles,
    xLabels,
    deltaLabel
      ? `<text x="${frame.plotX}" y="${frame.height - 44}" font-family="${FONT_FAMILY}" font-size="13" fill="${COLORS.text}">${xmlEscape(deltaLabel)}</text>`
      : '',
  ].join('');
}

// ---------- Horizontal bar chart (magnets / exodus / sustainability) ----------

interface HorizontalBarRow {
  readonly label: string;
  readonly value: number;
  readonly displayValue: string;
  readonly color: string;
}

function renderHorizontalBars(frame: SvgFrame, rows: readonly HorizontalBarRow[]): string {
  if (rows.length === 0) {
    return emptyPlaceholder(frame, 'Sin zonas para rankear en este periodo');
  }

  const absMax = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const rowHeight = frame.plotHeight / rows.length;
  const barHeight = Math.max(12, rowHeight * 0.6);
  const labelWidth = 220;
  const valueWidth = 100;
  const barAreaX = frame.plotX + labelWidth;
  const barAreaWidth = frame.plotWidth - labelWidth - valueWidth;

  return rows
    .map((row, idx) => {
      const rowY = frame.plotY + idx * rowHeight + rowHeight / 2;
      const barY = rowY - barHeight / 2;
      const normalized = clamp(Math.abs(row.value) / absMax, 0, 1);
      const barWidth = barAreaWidth * normalized;
      const barX = row.value >= 0 ? barAreaX : barAreaX + barAreaWidth - barWidth;
      const valueX = barAreaX + barAreaWidth + 8;
      const labelSafe = xmlEscape(row.label);
      const valueSafe = xmlEscape(row.displayValue);
      return [
        `<text x="${frame.plotX}" y="${rowY + 4}" font-family="${FONT_FAMILY}" font-size="14" fill="${COLORS.text}">${labelSafe}</text>`,
        `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" fill="${row.color}"/>`,
        `<text x="${valueX.toFixed(1)}" y="${rowY + 4}" font-family="${FONT_FAMILY}" font-size="13" fill="${COLORS.text}">${valueSafe}</text>`,
      ].join('');
    })
    .join('');
}

function toMagnetsRows(rows: readonly MagnetExodusRow[]): readonly HorizontalBarRow[] {
  return rows.slice(0, 10).map((r) => ({
    label: r.zone_label,
    value: r.net_flow,
    displayValue: `${r.net_flow >= 0 ? '+' : ''}${formatNumber(r.net_flow, 0)}`,
    color: COLORS.positive,
  }));
}

function toExodusRows(rows: readonly MagnetExodusRow[]): readonly HorizontalBarRow[] {
  return rows.slice(0, 10).map((r) => ({
    label: r.zone_label,
    value: r.net_flow,
    displayValue: `${formatNumber(r.net_flow, 0)}`,
    color: COLORS.danger,
  }));
}

function toSustainabilityRows(
  entries: readonly ScorecardRankingEntry[],
): readonly HorizontalBarRow[] {
  return entries.slice(0, 10).map((r) => ({
    label: r.zone_label,
    value: r.value,
    displayValue: formatNumber(r.value, 1),
    color: COLORS.primary,
  }));
}

// ---------- Alpha lifecycle stacked bar ----------

function renderAlphaLifecycle(frame: SvgFrame, data: AlphaLifecycleChartData): string {
  const counts = data.summary.counts_by_state;
  const states: ReadonlyArray<{ key: keyof typeof counts; label: string; color: string }> = [
    { key: 'emerging', label: 'Emerging', color: COLORS.emerging },
    { key: 'alpha', label: 'Alpha', color: COLORS.alpha },
    { key: 'peaked', label: 'Peaked', color: COLORS.peaked },
    { key: 'matured', label: 'Matured', color: COLORS.matured },
    { key: 'declining', label: 'Declining', color: COLORS.declining },
  ];
  const total = states.reduce((acc, s) => acc + counts[s.key], 0);
  if (total === 0) {
    return emptyPlaceholder(frame, 'Sin zonas alpha registradas en este periodo');
  }

  const barHeight = Math.min(120, frame.plotHeight * 0.35);
  const barY = frame.plotY + (frame.plotHeight - barHeight) / 2;
  let cursorX = frame.plotX;
  const segments: string[] = [];
  const legend: string[] = [];
  const legendStartY = barY + barHeight + 48;

  states.forEach((state, idx) => {
    const value = counts[state.key];
    const width = total > 0 ? (value / total) * frame.plotWidth : 0;
    if (width > 0) {
      segments.push(
        `<rect x="${cursorX.toFixed(1)}" y="${barY.toFixed(1)}" width="${width.toFixed(1)}" height="${barHeight}" fill="${state.color}"/>`,
      );
      if (width > 70) {
        segments.push(
          `<text x="${(cursorX + width / 2).toFixed(1)}" y="${(barY + barHeight / 2 + 6).toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="18" font-weight="700" fill="${COLORS.background}">${value}</text>`,
        );
      }
    }
    const legendX = frame.plotX + (idx % 5) * (frame.plotWidth / 5);
    legend.push(
      `<rect x="${legendX.toFixed(1)}" y="${legendStartY.toFixed(1)}" width="16" height="16" fill="${state.color}"/>`,
      `<text x="${(legendX + 22).toFixed(1)}" y="${(legendStartY + 13).toFixed(1)}" font-family="${FONT_FAMILY}" font-size="13" fill="${COLORS.text}">${xmlEscape(state.label)} (${value})</text>`,
    );
    cursorX += width;
  });

  return [segments.join(''), legend.join('')].join('');
}

// ---------- Dispatcher ----------

function renderChartBody(frame: SvgFrame, data: ChartData): string {
  switch (data.kind) {
    case 'pulse-national-trend':
      return renderPulseTrend(frame, data);
    case 'top-magnets-ranking':
      return renderHorizontalBars(frame, toMagnetsRows(data.ranking.top_magnets));
    case 'top-exodus-ranking':
      return renderHorizontalBars(frame, toExodusRows(data.ranking.top_exodus));
    case 'alpha-lifecycle-sankey':
      return renderAlphaLifecycle(frame, data);
    case 'sustainability-ids-top10':
      return renderHorizontalBars(frame, toSustainabilityRows(data.section.ranking_ids));
    default: {
      const _exhaustive: never = data;
      void _exhaustive;
      return '';
    }
  }
}

// ---------- API pública ----------

export function renderChartSVG(data: ChartData, options: RenderChartOptions = {}): string {
  const platform: ChartPlatform = options.platform ?? 'twitter';
  const dims = PLATFORM_DIMENSIONS[platform];
  const frame = buildFrame(dims);
  const body = renderChartBody(frame, data);
  return [
    svgOpen(frame),
    svgHeader(frame, data.title, options.subtitle),
    body,
    svgFooter(frame),
    svgClose(),
  ].join('');
}

export function svgToBuffer(svg: string): Buffer {
  return Buffer.from(svg, 'utf-8');
}

export function dimensionsFor(platform: ChartPlatform): Dimensions {
  return PLATFORM_DIMENSIONS[platform];
}

export type { Dimensions };
