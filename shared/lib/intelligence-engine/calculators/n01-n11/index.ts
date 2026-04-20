// N01-N11 (11) — registry side-effect. Ver n0/index.ts.

import { registerCalculator } from '../run-score';

export function registerN01ToN11Calculators(): void {
  registerCalculator(
    'N01',
    async () => (await import('./n01-ecosystem-diversity')).n01EcosystemDiversityCalculator,
  );
  registerCalculator(
    'N02',
    async () => (await import('./n02-employment-accessibility')).n02EmploymentCalculator,
  );
  registerCalculator(
    'N03',
    async () => (await import('./n03-gentrification-velocity')).n03GentrificationCalculator,
  );
  registerCalculator(
    'N04',
    async () => (await import('./n04-crime-trajectory')).n04CrimeTrajectoryCalculator,
  );
  registerCalculator(
    'N05',
    async () => (await import('./n05-infrastructure-resilience')).n05ResilienceCalculator,
  );
  registerCalculator(
    'N06',
    async () => (await import('./n06-school-premium')).n06SchoolPremiumCalculator,
  );
  registerCalculator(
    'N07',
    async () => (await import('./n07-water-security')).n07WaterSecurityCalculator,
  );
  registerCalculator(
    'N08',
    async () => (await import('./n08-walkability-mx')).n08WalkabilityCalculator,
  );
  registerCalculator(
    'N09',
    async () => (await import('./n09-nightlife-economy')).n09NightlifeCalculator,
  );
  registerCalculator(
    'N10',
    async () => (await import('./n10-senior-livability')).n10SeniorLivabilityCalculator,
  );
  registerCalculator(
    'N11',
    async () => (await import('./n11-dmx-momentum-index')).n11DmxMomentumCalculator,
  );
}
