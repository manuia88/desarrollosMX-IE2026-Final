// F14.F.8 Sprint 7 BIBLIA Upgrade 8 — Zone heatmap visual generator.
// H1: genera SVG inline con scores overlay (zero external API). H2: Mapbox static image.

import { getZoneScores, type ZoneScoresSnapshot } from '@/shared/lib/ie-cross-feature';

export interface HeatmapVisualResult {
  readonly svgMarkup: string;
  readonly scores: ZoneScoresSnapshot;
}

export async function generateZoneHeatmapVisual(zoneId: string): Promise<HeatmapVisualResult> {
  const scores = await getZoneScores(zoneId);
  const svgMarkup = renderHeatmapSvg(scores);
  return { svgMarkup, scores };
}

export function renderHeatmapSvg(scores: ZoneScoresSnapshot): string {
  const cells: Array<{ label: string; value: number | null; color: string }> = [
    { label: 'Pulse', value: scores.pulse, color: scoreColor(scores.pulse) },
    { label: 'Futures', value: scores.futures, color: scoreColor(scores.futures) },
    { label: 'Ghost', value: scores.ghost, color: scoreColor(scores.ghost, true) },
    { label: 'Alpha', value: scores.alpha, color: scoreColor(scores.alpha) },
  ];
  const w = 320;
  const h = 80;
  const cellW = w / cells.length;
  let inner = '';
  cells.forEach((c, i) => {
    const x = i * cellW;
    inner += `<rect x="${x}" y="0" width="${cellW - 2}" height="${h}" fill="${c.color}" rx="6"/>`;
    inner += `<text x="${x + cellW / 2}" y="32" font-family="Outfit, sans-serif" font-size="11" fill="#fff" text-anchor="middle" font-weight="600">${c.label}</text>`;
    inner += `<text x="${x + cellW / 2}" y="60" font-family="Outfit, sans-serif" font-size="20" fill="#fff" text-anchor="middle" font-weight="800">${c.value === null ? '--' : c.value.toFixed(0)}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function scoreColor(value: number | null, inverted = false): string {
  if (value === null) return '#475569';
  const normalized = inverted ? 100 - value : value;
  if (normalized >= 80) return '#22c55e';
  if (normalized >= 60) return '#eab308';
  if (normalized >= 40) return '#f97316';
  return '#ef4444';
}
