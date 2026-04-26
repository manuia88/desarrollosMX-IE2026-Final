export type QualityLevel = 'competitivo' | 'moderado' | 'fueraMercado' | 'sinACM';

export function qualityScoreLabel(score: number | null | undefined): QualityLevel {
  if (score === null || score === undefined) return 'sinACM';
  if (score >= 80) return 'competitivo';
  if (score >= 60) return 'moderado';
  return 'fueraMercado';
}

export const QUALITY_LEVEL_KEYS: readonly QualityLevel[] = [
  'competitivo',
  'moderado',
  'fueraMercado',
  'sinACM',
] as const;
