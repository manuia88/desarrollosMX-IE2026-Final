// N1 (16) — registry side-effect para runScore().
// Importar este módulo al startup (instrumentation.ts) habilita worker cron
// invocar runScore('F08', ...) sin error 'calculator_not_loaded'.
// Dynamic imports evitan cold-start penalty si el registry no se consume.

import { registerCalculator } from '../run-score';

export function registerN1Calculators(): void {
  registerCalculator(
    'F08',
    async () => (await import('./f08-life-quality-index')).f08LifeQualityIndexCalculator,
  );
  registerCalculator('F12', async () => (await import('./f12-risk-map')).f12RiskMapCalculator);
  registerCalculator(
    'H07',
    async () => (await import('./h07-environmental')).h07EnvironmentalCalculator,
  );
  registerCalculator(
    'A02',
    async () => (await import('./a02-investment-simulation')).a02InvestmentSimulationCalculator,
  );
  registerCalculator('A05', async () => (await import('./a05-tco-10y')).a05Tco10yCalculator);
  registerCalculator(
    'A06',
    async () => (await import('./a06-neighborhood')).a06NeighborhoodCalculator,
  );
  registerCalculator(
    'A12',
    async () => (await import('./a12-price-fairness')).a12PriceFairnessCalculator,
  );
  registerCalculator(
    'B01',
    async () => (await import('./b01-demand-heatmap')).b01DemandHeatmapCalculator,
  );
  registerCalculator(
    'B02',
    async () => (await import('./b02-margin-pressure')).b02MarginPressureCalculator,
  );
  registerCalculator(
    'B04',
    async () => (await import('./b04-product-market-fit')).b04ProductMarketFitCalculator,
  );
  registerCalculator(
    'B07',
    async () => (await import('./b07-competitive-intel')).b07CompetitiveIntelCalculator,
  );
  registerCalculator(
    'B08',
    async () => (await import('./b08-absorption-forecast')).b08AbsorptionForecastCalculator,
  );
  registerCalculator(
    'D05',
    async () => (await import('./d05-gentrification')).d05GentrificationCalculator,
  );
  registerCalculator(
    'D06',
    async () => (await import('./d06-affordability-crisis')).d06AffordabilityCrisisCalculator,
  );
  registerCalculator(
    'H05',
    async () => (await import('./h05-trust-score')).h05TrustScoreCalculator,
  );
  registerCalculator(
    'H14',
    async () => (await import('./h14-buyer-persona')).h14BuyerPersonaCalculator,
  );
}
