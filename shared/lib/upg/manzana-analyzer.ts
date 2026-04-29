import type { UpgDisclosure } from './types';

export interface ManzanaScores {
  readonly f01Safety: number | null;
  readonly f03Ecosystem: number | null;
  readonly n01Diversity: number | null;
  readonly f10Gentrification: number | null;
  readonly f09Value: number | null;
}

export interface ManzanaEngineResult {
  readonly scoreTotal: number;
  readonly breakdown: {
    readonly seguridad: number | null;
    readonly ecosistema: number | null;
    readonly diversidad: number | null;
    readonly gentrificacion: number | null;
    readonly value: number | null;
  };
  readonly missing: readonly string[];
  readonly recommendation: string;
  readonly disclosure: UpgDisclosure;
}

const WEIGHTS = {
  f01Safety: 0.25,
  f03Ecosystem: 0.2,
  n01Diversity: 0.15,
  f10Gentrification: 0.2,
  f09Value: 0.2,
} as const;

export function runManzanaAnalyzer(input: ManzanaScores): ManzanaEngineResult {
  const missing: string[] = [];
  let weightedSum = 0;
  let weightSumApplied = 0;

  if (input.f01Safety === null) missing.push('F01_safety');
  else {
    weightedSum += input.f01Safety * WEIGHTS.f01Safety;
    weightSumApplied += WEIGHTS.f01Safety;
  }
  if (input.f03Ecosystem === null) missing.push('F03_ecosystem');
  else {
    weightedSum += input.f03Ecosystem * WEIGHTS.f03Ecosystem;
    weightSumApplied += WEIGHTS.f03Ecosystem;
  }
  if (input.n01Diversity === null) missing.push('N01_diversity');
  else {
    weightedSum += input.n01Diversity * WEIGHTS.n01Diversity;
    weightSumApplied += WEIGHTS.n01Diversity;
  }
  if (input.f10Gentrification === null) missing.push('F10_gentrification');
  else {
    weightedSum += input.f10Gentrification * WEIGHTS.f10Gentrification;
    weightSumApplied += WEIGHTS.f10Gentrification;
  }
  if (input.f09Value === null) missing.push('F09_value');
  else {
    weightedSum += input.f09Value * WEIGHTS.f09Value;
    weightSumApplied += WEIGHTS.f09Value;
  }

  const scoreTotal = weightSumApplied > 0 ? Math.round(weightedSum / weightSumApplied) : 0;

  const recommendation =
    scoreTotal >= 75
      ? 'Manzana premium para desarrollar — mix balanceado de seguridad, ecosistema y valor'
      : scoreTotal >= 60
        ? 'Manzana viable con caveats — verifica métricas faltantes antes de cierre'
        : scoreTotal >= 45
          ? 'Riesgo medio — diferenciación de producto necesaria'
          : 'No recomendada — buscar alternativas en zonas vecinas';

  const disclosure: UpgDisclosure =
    missing.length === 0 ? 'observed' : missing.length <= 2 ? 'mixed' : 'synthetic';

  return {
    scoreTotal,
    breakdown: {
      seguridad: input.f01Safety,
      ecosistema: input.f03Ecosystem,
      diversidad: input.n01Diversity,
      gentrificacion: input.f10Gentrification,
      value: input.f09Value,
    },
    missing,
    recommendation,
    disclosure,
  };
}
