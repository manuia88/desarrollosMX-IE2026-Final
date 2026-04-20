// N3 (12) — registry side-effect para runScore().
// Importar este módulo al startup (instrumentation.ts) habilita worker cron
// invocar runScore('A07', ...) sin error 'calculator_not_loaded'.
// Dynamic imports evitan cold-start penalty si el registry no se consume.

import { registerCalculator } from '../run-score';

export function registerN3Calculators(): void {
  registerCalculator(
    'A07',
    async () => (await import('./a07-timing-optimizer')).a07TimingOptimizerCalculator,
  );
  registerCalculator(
    'A08',
    async () => (await import('./a08-comparador-multi-d')).a08ComparadorMultiDCalculator,
  );
  registerCalculator(
    'A09',
    async () => (await import('./a09-risk-score-comprador')).a09RiskScoreCompradorCalculator,
  );
  registerCalculator(
    'A10',
    async () => (await import('./a10-lifestyle-match')).a10LifestyleMatchCalculator,
  );
  registerCalculator(
    'A11',
    async () => (await import('./a11-patrimonio-20y')).a11Patrimonio20yCalculator,
  );
  registerCalculator(
    'B06',
    async () => (await import('./b06-project-genesis')).b06ProjectGenesisCalculator,
  );
  registerCalculator(
    'B11',
    async () => (await import('./b11-channel-performance')).b11ChannelPerformanceCalculator,
  );
  registerCalculator(
    'C04',
    async () => (await import('./c04-objection-killer')).c04ObjectionKillerCalculator,
  );
  registerCalculator(
    'C06',
    async () => (await import('./c06-commission-forecast')).c06CommissionForecastCalculator,
  );
  registerCalculator(
    'D04',
    async () => (await import('./d04-cross-correlation')).d04CrossCorrelationCalculator,
  );
  registerCalculator(
    'H13',
    async () => (await import('./h13-site-selection-ai')).h13SiteSelectionAiCalculator,
  );
  registerCalculator(
    'H15',
    async () => (await import('./h15-due-diligence')).h15DueDiligenceCalculator,
  );
}
