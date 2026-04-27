import { describe, expect, it } from 'vitest';
import {
  estadisticasInput,
  leaderboardInput,
  metricsSemaforoInput,
  pipelineFunnelInput,
  propiedadTipoEnum,
  revenueByMonthInput,
  semaforoTier,
  teamComparisonInput,
  visitsConversionInput,
  zonesActivityInput,
} from '../schemas';

describe('estadisticas schemas', () => {
  it('estadisticasInput accepts valid date range + filters', () => {
    const parsed = estadisticasInput.parse({
      rangeFrom: '2026-04-01',
      rangeTo: '2026-04-30',
      filters: { colonia: 'Roma Norte', tipo: 'departamento', equipo: false },
    });
    expect(parsed.filters?.colonia).toBe('Roma Norte');
  });

  it('estadisticasInput rejects invalid date string', () => {
    expect(() =>
      estadisticasInput.parse({ rangeFrom: 'not-a-date', rangeTo: '2026-04-30' }),
    ).toThrow();
  });

  it('propiedadTipoEnum accepts the 5 canonical types', () => {
    expect(propiedadTipoEnum.options).toEqual([
      'departamento',
      'casa',
      'terreno',
      'oficina',
      'local',
    ]);
  });

  it('semaforoTier accepts 3 tiers', () => {
    expect(semaforoTier.options).toEqual(['green', 'yellow', 'red']);
  });

  it('all range-only schemas accept rangeFrom + rangeTo', () => {
    const args = { rangeFrom: '2026-04-01', rangeTo: '2026-04-30' };
    expect(metricsSemaforoInput.parse(args)).toBeDefined();
    expect(pipelineFunnelInput.parse(args)).toBeDefined();
    expect(revenueByMonthInput.parse(args)).toBeDefined();
    expect(visitsConversionInput.parse(args)).toBeDefined();
    expect(zonesActivityInput.parse(args)).toBeDefined();
    expect(teamComparisonInput.parse(args)).toBeDefined();
  });

  it('leaderboardInput accepts optional month', () => {
    expect(leaderboardInput.parse({}).month).toBeUndefined();
    expect(leaderboardInput.parse({ month: '2026-04-01' }).month).toBe('2026-04-01');
  });
});
