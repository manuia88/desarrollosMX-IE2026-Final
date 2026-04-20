// N2 (14) — registry side-effect para runScore().
// Importar este módulo al startup (instrumentation.ts) habilita worker cron
// invocar runScore('F09', ...) sin error 'calculator_not_loaded'.
// Dynamic imports evitan cold-start penalty si el registry no se consume.

import { registerCalculator } from '../run-score';

export function registerN2Calculators(): void {
  registerCalculator('F09', async () => (await import('./f09-value')).f09ValueCalculator);
  registerCalculator(
    'F10',
    async () => (await import('./f10-gentrification-2')).f10Gentrification2Calculator,
  );
  registerCalculator(
    'B03',
    async () => (await import('./b03-pricing-autopilot')).b03PricingAutopilotCalculator,
  );
  registerCalculator(
    'B05',
    async () => (await import('./b05-market-cycle')).b05MarketCycleCalculator,
  );
  registerCalculator('B09', async () => (await import('./b09-cash-flow')).b09CashFlowCalculator);
  registerCalculator(
    'B10',
    async () => (await import('./b10-unit-revenue-opt')).b10UnitRevenueOptCalculator,
  );
  registerCalculator(
    'B13',
    async () => (await import('./b13-amenity-roi')).b13AmenityRoiCalculator,
  );
  registerCalculator(
    'B14',
    async () => (await import('./b14-buyer-persona-proyecto')).b14BuyerPersonaProyectoCalculator,
  );
  registerCalculator(
    'B15',
    async () => (await import('./b15-launch-timing')).b15LaunchTimingCalculator,
  );
  registerCalculator('C01', async () => (await import('./c01-lead-score')).c01LeadScoreCalculator);
  registerCalculator(
    'C03',
    async () => (await import('./c03-matching-engine')).c03MatchingEngineCalculator,
  );
  registerCalculator(
    'D03',
    async () => (await import('./d03-supply-pipeline')).d03SupplyPipelineCalculator,
  );
  registerCalculator(
    'H12',
    async () => (await import('./h12-zona-oportunidad')).h12ZonaOportunidadCalculator,
  );
  registerCalculator(
    'H16',
    async () => (await import('./h16-neighborhood-evolution')).h16NeighborhoodEvolutionCalculator,
  );
}
