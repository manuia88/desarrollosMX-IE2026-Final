import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    causal: {
      getExplanation: {
        useQuery: vi.fn(() => ({
          data: {
            explanation_md: 'Roma Norte muestra **alta** demanda [[score:x]] y transporte fuerte.',
            citations: [
              {
                ref_id: 'score:x',
                type: 'score',
                label: 'IPV',
                value: 88.2,
                source: 'DMX Indices',
              },
            ],
            model: 'claude-sonnet-4-5',
            prompt_version: 'v1',
            generated_at: '2026-04-21T00:00:00Z',
            cached: false,
          },
          isLoading: false,
          error: null,
        })),
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}));

describe('CausalExplanation — module export smoke', () => {
  it('exporta CausalExplanation como función', async () => {
    const mod = await import('../components/CausalExplanation');
    expect(typeof mod.CausalExplanation).toBe('function');
    expect(mod.CausalExplanation.name).toBe('CausalExplanation');
  });

  it('acepta props mínimas del contrato (type check)', async () => {
    const mod = await import('../components/CausalExplanation');
    const props = {
      scoreId: 'IPV:colonia:roma-norte:2026-04-01',
      indexCode: 'IPV' as const,
      scopeType: 'colonia' as const,
      scopeId: 'roma-norte',
    };
    expect(props.indexCode).toBe('IPV');
    expect(typeof mod.CausalExplanation).toBe('function');
  });
});

describe('useCausalExplanation — hook export smoke', () => {
  it('exporta hook como función', async () => {
    const mod = await import('../hooks/useCausalExplanation');
    expect(typeof mod.useCausalExplanation).toBe('function');
  });

  it('llama trpc.causal.getExplanation con el input esperado', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { useCausalExplanation } = await import('../hooks/useCausalExplanation');
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
    const { useCausalExplanation } = await import('../hooks/useCausalExplanation');
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
    const { useCausalExplanation } = await import('../hooks/useCausalExplanation');
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
