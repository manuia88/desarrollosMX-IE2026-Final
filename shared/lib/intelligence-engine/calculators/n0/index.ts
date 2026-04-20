// N0 originales (21) — registry side-effect para runScore().
// Importar este módulo al startup (instrumentation.ts) habilita worker cron
// invocar runScore('F01', ...) sin error 'calculator_not_loaded'.
// Dynamic imports evitan cold-start penalty si el registry no se consume.

import { registerCalculator } from '../run-score';

export function registerN0Calculators(): void {
  registerCalculator('F01', async () => (await import('./f01-safety')).f01SafetyCalculator);
  registerCalculator('F02', async () => (await import('./f02-transit')).f02TransitCalculator);
  registerCalculator('F03', async () => (await import('./f03-ecosystem')).f03EcosystemCalculator);
  registerCalculator(
    'F04',
    async () => (await import('./f04-air-quality')).f04AirQualityCalculator,
  );
  registerCalculator('F05', async () => (await import('./f05-water')).f05WaterCalculator);
  registerCalculator('F06', async () => (await import('./f06-land-use')).f06LandUseCalculator);
  registerCalculator('F07', async () => (await import('./f07-predial')).f07PredialCalculator);
  registerCalculator(
    'H01',
    async () => (await import('./h01-school-quality')).h01SchoolQualityCalculator,
  );
  registerCalculator(
    'H02',
    async () => (await import('./h02-health-access')).h02HealthAccessCalculator,
  );
  registerCalculator(
    'H03',
    async () => (await import('./h03-seismic-risk')).h03SeismicRiskCalculator,
  );
  registerCalculator(
    'H04',
    async () => (await import('./h04-credit-demand')).h04CreditDemandCalculator,
  );
  registerCalculator(
    'H06',
    async () => (await import('./h06-city-services')).h06CityServicesCalculator,
  );
  registerCalculator(
    'H08',
    async () => (await import('./h08-heritage-zone')).h08HeritageZoneCalculator,
  );
  registerCalculator(
    'H09',
    async () => (await import('./h09-commute-time')).h09CommuteTimeCalculator,
  );
  registerCalculator(
    'H10',
    async () => (await import('./h10-water-crisis')).h10WaterCrisisCalculator,
  );
  registerCalculator('H11', async () => (await import('./h11-infonavit')).h11InfonavitCalculator);
  registerCalculator(
    'A01',
    async () => (await import('./a01-affordability')).a01AffordabilityCalculator,
  );
  registerCalculator('A03', async () => (await import('./a03-migration')).a03MigrationCalculator);
  registerCalculator('A04', async () => (await import('./a04-arbitrage')).a04ArbitrageCalculator);
  registerCalculator(
    'B12',
    async () => (await import('./b12-cost-tracker')).b12CostTrackerCalculator,
  );
  registerCalculator('D07', async () => (await import('./d07-str-ltr')).d07StrLtrCalculator);
}
