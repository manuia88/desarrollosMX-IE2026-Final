import { computeH12ZonaOportunidad } from '@/shared/lib/intelligence-engine/calculators/n2/h12-zona-oportunidad';
import type { UpgDisclosure } from './types';

export interface OportunidadGhostRow {
  readonly coloniaId: string;
  readonly score: number;
  readonly ghostScore: number;
  readonly transitionProbability: number;
  readonly rank: number;
  readonly searchVolume: number;
  readonly pressMentions: number;
}

export interface OportunidadEngineInput {
  readonly ghostRows: readonly OportunidadGhostRow[];
  readonly limit: number;
}

export interface OportunidadEnrichedEntry extends OportunidadGhostRow {
  readonly h12Score: number;
  readonly category: 'emergente' | 'consolidacion' | 'oculta' | 'oportunidad_baja';
}

export interface OportunidadEngineResult {
  readonly entries: readonly OportunidadEnrichedEntry[];
  readonly totalRows: number;
  readonly disclosure: UpgDisclosure;
}

export function runOportunidadRanker(input: OportunidadEngineInput): OportunidadEngineResult {
  const entries: OportunidadEnrichedEntry[] = input.ghostRows
    .slice(0, Math.max(1, input.limit))
    .map((row) => {
      const h12 = computeH12ZonaOportunidad({
        f09: row.score,
        n11: row.transitionProbability * 100,
        a04: row.ghostScore,
      });

      const category: OportunidadEnrichedEntry['category'] =
        row.ghostScore >= 70 && row.transitionProbability >= 0.6
          ? 'emergente'
          : row.ghostScore >= 50
            ? 'consolidacion'
            : row.searchVolume > 500 && row.pressMentions === 0
              ? 'oculta'
              : 'oportunidad_baja';

      return {
        ...row,
        h12Score: h12.value,
        category,
      };
    });

  const disclosure: UpgDisclosure =
    input.ghostRows.length >= 20 ? 'observed' : input.ghostRows.length >= 5 ? 'mixed' : 'synthetic';

  return {
    entries,
    totalRows: input.ghostRows.length,
    disclosure,
  };
}
