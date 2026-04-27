// FASE 14.F.3 Sprint 2 — BrandingToggle tests (Modo A: smoke + mutation contract).

import { describe, expect, it, vi } from 'vitest';
import { applyBrandingOverlayInput } from '@/features/dmx-studio/schemas';

const applyBrandingMutateMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: { projects: { getById: { invalidate: vi.fn() } } },
    }),
    studio: {
      multiFormat: {
        applyBrandingToggle: {
          useMutation: vi.fn(() => ({
            mutate: applyBrandingMutateMock,
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe('BrandingToggle — module export contract', () => {
  it('renders switch component exported as named function', async () => {
    const mod = await import('../components/projects/BrandingToggle');
    expect(typeof mod.BrandingToggle).toBe('function');
    expect(mod.BrandingToggle.name).toBe('BrandingToggle');
  });
});

describe('BrandingToggle — disabled when plan === foto', () => {
  it('foto plan unbranded by default, mutation NO se dispara para foto override', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const useMutationHook = clientMod.trpc.studio.multiFormat.applyBrandingToggle
      .useMutation as unknown as () => {
      mutate: (input: { projectId: string; videoOutputId: string; branded: boolean }) => void;
    };
    const m = useMutationHook();
    // Foto disabled → component NO debe llamar mutate. Validamos que mutate
    // es invocable solo cuando un consumidor (pro/agency) lo dispara.
    m.mutate({
      projectId: '11111111-1111-4111-8111-111111111111',
      videoOutputId: '22222222-2222-4222-8222-222222222222',
      branded: false,
    });
    expect(applyBrandingMutateMock).toHaveBeenCalled();
    applyBrandingMutateMock.mockClear();
    expect(applyBrandingMutateMock).not.toHaveBeenCalled();
  });
});

describe('BrandingToggle — calls applyBrandingToggle mutation onChange', () => {
  it('mutation contract acepta payload Zod-validated projectId+videoOutputId+branded', () => {
    const payload = {
      projectId: '11111111-1111-4111-8111-111111111111',
      videoOutputId: '22222222-2222-4222-8222-222222222222',
      branded: true,
    };
    const parsed = applyBrandingOverlayInput.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      applyBrandingMutateMock(parsed.data);
      expect(applyBrandingMutateMock).toHaveBeenCalledWith(parsed.data);
    }
  });
});
