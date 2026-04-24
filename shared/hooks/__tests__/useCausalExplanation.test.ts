import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    causal: {
      getExplanation: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
          error: null,
        })),
      },
    },
  },
}));

describe('useCausalExplanation — hook export smoke', () => {
  it('exporta hook como función', async () => {
    const mod = await import('../useCausalExplanation');
    expect(typeof mod.useCausalExplanation).toBe('function');
  });

  it('expone CAUSAL_SUPPORTED_LOCALES + isCausalLocaleSupported', async () => {
    const mod = await import('../useCausalExplanation');
    expect(mod.CAUSAL_SUPPORTED_LOCALES).toEqual(['es-MX', 'es-CO', 'es-AR']);
    expect(mod.isCausalLocaleSupported('es-MX')).toBe(true);
    expect(mod.isCausalLocaleSupported('en-US')).toBe(false);
  });

  it('llama trpc.causal.getExplanation con el input esperado', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { useCausalExplanation } = await import('../useCausalExplanation');
    useCausalExplanation({
      scoreId: 's1',
      indexCode: 'IPV',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      periodDate: '2026-04-01',
    });
    const spy = clientMod.trpc.causal.getExplanation.useQuery as ReturnType<typeof vi.fn>;
    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (!lastCall) return;
    expect(lastCall[0]).toMatchObject({
      scoreId: 's1',
      indexCode: 'IPV',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      periodDate: '2026-04-01',
    });
    expect(lastCall[1]).toMatchObject({ staleTime: 30 * 60 * 1000 });
  });

  it('omite periodDate cuando no se provee', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { useCausalExplanation } = await import('../useCausalExplanation');
    const spy = clientMod.trpc.causal.getExplanation.useQuery as ReturnType<typeof vi.fn>;
    spy.mockClear();
    useCausalExplanation({
      scoreId: 's2',
      indexCode: 'IAB',
      scopeType: 'alcaldia',
      scopeId: 'cuauhtemoc',
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (!lastCall) return;
    expect(Object.hasOwn(lastCall[0] as object, 'periodDate')).toBe(false);
  });

  it('respeta enabled=false', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { useCausalExplanation } = await import('../useCausalExplanation');
    const spy = clientMod.trpc.causal.getExplanation.useQuery as ReturnType<typeof vi.fn>;
    spy.mockClear();
    useCausalExplanation({
      scoreId: 's3',
      indexCode: 'IPV',
      scopeType: 'city',
      scopeId: 'cdmx',
      enabled: false,
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (!lastCall) return;
    expect(lastCall[1]).toMatchObject({ enabled: false });
  });
});
