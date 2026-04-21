// N4 (7) — registry side-effect para runScore().
// Importar este módulo al startup (instrumentation.ts) habilita worker cron
// invocar runScore('E01', ...) sin error 'calculator_not_loaded'.
// Dynamic imports evitan cold-start penalty si el registry no se consume.

import { registerCalculator } from '../run-score';

export function registerN4Calculators(): void {
  registerCalculator(
    'E01',
    async () => (await import('./e01-full-project-score')).e01FullProjectScoreCalculator,
  );
  registerCalculator(
    'G01',
    async () => (await import('./g01-full-score-publico')).g01FullScorePublicoCalculator,
  );
  registerCalculator(
    'E02',
    async () => (await import('./e02-portfolio-optimizer')).e02PortfolioOptimizerCalculator,
  );
  registerCalculator(
    'E03',
    async () => (await import('./e03-predictive-close')).e03PredictiveCloseCalculator,
  );
  registerCalculator(
    'E04',
    async () => (await import('./e04-anomaly-detector')).e04AnomalyDetectorCalculator,
  );
  registerCalculator(
    'D09',
    async () => (await import('./d09-ecosystem-health')).d09EcosystemHealthCalculator,
  );
  registerCalculator(
    'D02',
    async () => (await import('./d02-zona-ranking')).d02ZonaRankingCalculator,
  );
}
