import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

describe('developerUpgRouter — module export smoke', () => {
  it('exports developerUpgRouter with 9 procedures + listFeasibility', async () => {
    const mod = await import('../routes/developer-upg');
    expect(mod.developerUpgRouter).toBeDefined();
    const record = mod.developerUpgRouter as unknown as Record<string, unknown>;
    expect(record.getDemandHeatmapReal).toBeDefined();
    expect(record.getPricingAdvisor).toBeDefined();
    expect(record.getCompetitive).toBeDefined();
    expect(record.getBenchmark).toBeDefined();
    expect(record.generateFeasibilityReport).toBeDefined();
    expect(record.listFeasibility).toBeDefined();
    expect(record.listLandingsTerrenos).toBeDefined();
    expect(record.getManzanaAnalysis).toBeDefined();
    expect(record.getZonasOportunidad).toBeDefined();
    expect(record.getProyeccion5Years).toBeDefined();
  });
});

describe('developer-upg schemas — input validation', () => {
  it('upgBenchmarkInput accepts YYYY-QX format', async () => {
    const { upgBenchmarkInput } = await import('../schemas');
    expect(() =>
      upgBenchmarkInput.parse({
        desarrolladoraId: '00000000-0000-4000-8000-000000000000',
        periodQuarter: '2026-Q1',
      }),
    ).not.toThrow();
  });

  it('upgBenchmarkInput rejects invalid quarter format', async () => {
    const { upgBenchmarkInput } = await import('../schemas');
    expect(() =>
      upgBenchmarkInput.parse({
        desarrolladoraId: '00000000-0000-4000-8000-000000000000',
        periodQuarter: '2026-1',
      }),
    ).toThrow();
  });

  it('upgFeasibilityNewInput requires programa with valid units', async () => {
    const { upgFeasibilityNewInput } = await import('../schemas');
    expect(() =>
      upgFeasibilityNewInput.parse({
        programa: {
          tipo: 'departamentos',
          unitsTotal: 50,
          precioPromedioMxn: 4_500_000,
          costoTotalEstimateMxn: 150_000_000,
          constructionMonths: 18,
          absorcionMensual: 3,
          discountRateAnnual: 12,
          amortizacionTerrenoMensual: 0,
          gastosFijosMensuales: 50_000,
        },
      }),
    ).not.toThrow();
  });

  it('upgFeasibilityNewInput rejects negative price', async () => {
    const { upgFeasibilityNewInput } = await import('../schemas');
    expect(() =>
      upgFeasibilityNewInput.parse({
        programa: {
          tipo: 'departamentos',
          unitsTotal: 50,
          precioPromedioMxn: -100,
          costoTotalEstimateMxn: 150_000_000,
          constructionMonths: 18,
          absorcionMensual: 3,
          discountRateAnnual: 12,
          amortizacionTerrenoMensual: 0,
          gastosFijosMensuales: 50_000,
        },
      }),
    ).toThrow();
  });

  it('upgManzanaInput accepts coloniaId-only OR lat/lng-only', async () => {
    const { upgManzanaInput } = await import('../schemas');
    expect(() =>
      upgManzanaInput.parse({ coloniaId: '00000000-0000-4000-8000-000000000000' }),
    ).not.toThrow();
    expect(() => upgManzanaInput.parse({ lat: 19.43, lng: -99.13 })).not.toThrow();
  });
});
