import { computeB01DemandHeatmap } from '@/shared/lib/intelligence-engine/calculators/n1/b01-demand-heatmap';
import type { UpgDisclosure } from './types';

export interface DemandHeatmapEngineInput {
  readonly searchesCount: number;
  readonly wishlistCount: number;
  readonly viewsCount: number;
  readonly leadsCount: number;
  readonly landingVisits: number;
  readonly busquedasActivas: number;
  readonly daysWindow: number;
}

export interface DemandHeatmapEngineResult {
  readonly score: number;
  readonly intensity: 'low' | 'medium' | 'high' | 'extreme';
  readonly busquedasActivas: number;
  readonly landingVisits: number;
  readonly conversionRate: number;
  readonly disclosure: UpgDisclosure;
}

export function runDemandHeatmapEngine(input: DemandHeatmapEngineInput): DemandHeatmapEngineResult {
  const compute = computeB01DemandHeatmap({
    searches_count: input.searchesCount,
    wishlist_count: input.wishlistCount,
    views_count: input.viewsCount,
    period_days: input.daysWindow,
  });

  const conversionRate =
    input.landingVisits > 0 ? (input.leadsCount / input.landingVisits) * 100 : 0;

  const intensity: DemandHeatmapEngineResult['intensity'] =
    compute.value >= 80
      ? 'extreme'
      : compute.value >= 60
        ? 'high'
        : compute.value >= 40
          ? 'medium'
          : 'low';

  const dataPoints = input.searchesCount + input.wishlistCount + input.busquedasActivas;
  const disclosure: UpgDisclosure =
    dataPoints >= 50 ? 'observed' : dataPoints >= 10 ? 'mixed' : 'synthetic';

  return {
    score: compute.value,
    intensity,
    busquedasActivas: input.busquedasActivas,
    landingVisits: input.landingVisits,
    conversionRate: Number(conversionRate.toFixed(2)),
    disclosure,
  };
}
