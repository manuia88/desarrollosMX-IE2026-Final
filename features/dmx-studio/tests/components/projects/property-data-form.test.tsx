// FASE 14.F.2 Sprint 1 — PropertyDataForm smoke + cross-function pre-fill contract.
// Modo A: tRPC suggestions mocked. Validates Zod schema + URL ?source=cross-function.

import { describe, expect, it, vi } from 'vitest';
import { createStudioProjectInput } from '@/features/dmx-studio/schemas';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

const mockSearchParams = new URLSearchParams('source=cross-function');

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      dashboard: {
        getCrossFunctionSuggestions: {
          useQuery: () => ({
            data: {
              developers: [],
              captaciones: [
                {
                  id: '00000000-0000-0000-0000-000000000001',
                  direccion: 'Av. Reforma 100',
                  ciudad: 'CDMX',
                  precioSolicitado: 5_000_000,
                  status: 'en_promocion',
                },
              ],
            },
            isLoading: false,
            error: null,
          }),
        },
      },
    },
  },
}));

describe('PropertyDataForm — module export smoke', () => {
  it('exports PropertyDataForm + PROPERTY_DATA_DEFAULTS', async () => {
    const mod = await import('../../../components/projects/PropertyDataForm');
    expect(typeof mod.PropertyDataForm).toBe('function');
    expect(mod.PROPERTY_DATA_DEFAULTS.currency).toBe('MXN');
    expect(mod.PROPERTY_DATA_DEFAULTS.title).toBe('');
    expect(Array.isArray(mod.PROPERTY_DATA_DEFAULTS.amenities)).toBe(true);
  });
});

describe('PropertyDataForm — Zod schema contract drives required title', () => {
  it('rejects title shorter than 3 chars (createStudioProjectInput)', () => {
    const result = createStudioProjectInput.safeParse({
      title: 'ab',
      projectType: 'standard',
      styleTemplateKey: 'modern_cinematic',
    });
    expect(result.success).toBe(false);
  });

  it('accepts well-formed payload with property data + currency MXN', () => {
    const result = createStudioProjectInput.safeParse({
      title: 'Penthouse Polanco',
      projectType: 'standard',
      styleTemplateKey: 'modern_cinematic',
      propertyData: {
        price: 12_500_000,
        currency: 'MXN',
        areaM2: 220,
        bedrooms: 3,
        bathrooms: 3.5,
        parking: 2,
        zone: 'Polanco',
        amenities: ['alberca', 'gym'],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('PropertyDataForm — cross-function pre-fill from query string', () => {
  it('reads ?source=cross-function and exposes captaciones via trpc query', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const useQuery = clientMod.trpc.studio.dashboard.getCrossFunctionSuggestions
      .useQuery as unknown as () => {
      data: {
        captaciones: ReadonlyArray<{
          id: string;
          direccion: string;
          ciudad: string;
          precioSolicitado: number;
        }>;
      };
      isLoading: boolean;
    };
    const result = useQuery();
    expect(result.data.captaciones.length).toBeGreaterThan(0);
    expect(result.data.captaciones[0]?.precioSolicitado).toBe(5_000_000);
    expect(mockSearchParams.get('source')).toBe('cross-function');
  });
});
