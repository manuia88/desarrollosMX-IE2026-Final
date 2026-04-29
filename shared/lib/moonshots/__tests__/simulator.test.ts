import { describe, expect, it, vi } from 'vitest';
import { simulateProject } from '../simulator';

function createSupabaseStub(insertedId = 'run-uuid-1') {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'simulator_runs') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: insertedId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'dmx_indices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

describe('simulator engine', () => {
  it('returns runId + outputs after persisting simulator_runs', async () => {
    const supabase = createSupabaseStub('run-1');
    const result = await simulateProject(
      supabase as unknown as Parameters<typeof simulateProject>[0],
      {
        ubicacion: { ciudad: 'CDMX', colonia: 'Roma Norte', countryCode: 'MX' },
        tipologia: { tipo: 'vertical', unidades: 60, m2Promedio: 80, amenidades: [] },
        pricing: {
          precioM2Mxn: 80_000,
          paymentSplit: { enganche: 0.2, mensualidades: 24, contraEntrega: 0.6 },
          costoConstruccionM2Mxn: 18_000,
          costoTerrenoMxn: 5_000_000,
          gastosFijosMxn: 150_000,
        },
      },
      'user-1',
      'dev-1',
    );

    expect(result.runId).toBe('run-1');
    expect(result.outputs.revenueMxn).toBeGreaterThan(0);
    expect(result.outputs.costMxn).toBeGreaterThan(0);
    expect(result.outputs.indicesUsed).toEqual([]);
  });

  it('produces sensitivity object with absorcion variants', async () => {
    const supabase = createSupabaseStub('run-2');
    const result = await simulateProject(
      supabase as unknown as Parameters<typeof simulateProject>[0],
      {
        ubicacion: { ciudad: 'CDMX', colonia: 'Condesa', countryCode: 'MX' },
        tipologia: { tipo: 'mixto', unidades: 40, m2Promedio: 100, amenidades: ['gym'] },
        pricing: {
          precioM2Mxn: 100_000,
          paymentSplit: { enganche: 0.25, mensualidades: 18, contraEntrega: 0.5 },
          costoConstruccionM2Mxn: 22_000,
          costoTerrenoMxn: 0,
          gastosFijosMxn: 200_000,
        },
      },
      'user-1',
      null,
    );

    expect(result.outputs.sensitivity).toHaveProperty('absorcionMinus20');
    expect(result.outputs.sensitivity).toHaveProperty('absorcionPlus20');
  });
});
