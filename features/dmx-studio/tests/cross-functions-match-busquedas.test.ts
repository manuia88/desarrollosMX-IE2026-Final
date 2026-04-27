// FASE 14.F.4 Sprint 3 — Cross-function 4 (UPGRADE 9 LATERAL) tests:
// findMatchingBusquedas lib zone + price match heuristics + STUB notification log.
// Modo A: pure-function tests con mocked Supabase chain. Cero red, cero créditos.

import { describe, expect, it, vi } from 'vitest';
import { findMatchingBusquedas } from '@/features/dmx-studio/lib/cross-functions/match-busquedas';

interface MockProject {
  id: string;
  user_id: string;
  status: string;
  source_metadata: unknown;
}

interface MockBusqueda {
  id: string;
  lead_id: string;
  status: string;
  criteria: unknown;
}

function buildSupabaseMock(project: MockProject | null, busquedas: MockBusqueda[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'studio_video_projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: project,
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'busquedas') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({
                  data: busquedas,
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface for tests
  } as any;
}

const PROJECT_ID = '33333333-3333-3333-3333-333333333333';
const ASESOR_ID = '44444444-4444-4444-4444-444444444444';

describe('findMatchingBusquedas', () => {
  it('returns matches when busqueda zone + price ranges fit project metadata', async () => {
    const project: MockProject = {
      id: PROJECT_ID,
      user_id: ASESOR_ID,
      status: 'published',
      source_metadata: { zone: 'Roma Norte', price: 8000000, currency: 'MXN' },
    };
    const busquedas: MockBusqueda[] = [
      {
        id: 'b1',
        lead_id: 'lead-a',
        status: 'activa',
        criteria: { zone: 'Roma', price_min: 5000000, price_max: 10000000 },
      },
      {
        id: 'b2',
        lead_id: 'lead-b',
        status: 'activa',
        criteria: { ciudades: ['Roma Norte', 'Condesa'], price_max: 9000000 },
      },
    ];
    const supabase = buildSupabaseMock(project, busquedas);

    const result = await findMatchingBusquedas(supabase, PROJECT_ID);

    expect(result.count).toBe(2);
    expect(result.matches[0]?.id).toBe('b1');
    expect(result.matches[0]?.matchedReason).toContain('zone');
    expect(result.matches[0]?.matchedReason).toContain('price');
    expect(result.matches[1]?.id).toBe('b2');
    expect(result.notificationStub).toBe(true);
  });

  it('returns empty array when no busquedas match (zone mismatch)', async () => {
    const project: MockProject = {
      id: PROJECT_ID,
      user_id: ASESOR_ID,
      status: 'published',
      source_metadata: { zone: 'Roma Norte', price: 8000000 },
    };
    const busquedas: MockBusqueda[] = [
      {
        id: 'b3',
        lead_id: 'lead-c',
        status: 'activa',
        criteria: { zone: 'Polanco', price_min: 5000000, price_max: 10000000 },
      },
    ];
    const supabase = buildSupabaseMock(project, busquedas);

    const result = await findMatchingBusquedas(supabase, PROJECT_ID);

    expect(result.count).toBe(0);
    expect(result.matches).toEqual([]);
  });

  it('filters out busquedas with price outside range', async () => {
    const project: MockProject = {
      id: PROJECT_ID,
      user_id: ASESOR_ID,
      status: 'published',
      source_metadata: { zone: 'Polanco', price: 15000000 },
    };
    const busquedas: MockBusqueda[] = [
      {
        id: 'b4',
        lead_id: 'lead-d',
        status: 'activa',
        criteria: { zone: 'Polanco', price_max: 10000000 },
      },
      {
        id: 'b5',
        lead_id: 'lead-e',
        status: 'activa',
        criteria: { zone: 'Polanco', price_min: 12000000, price_max: 18000000 },
      },
    ];
    const supabase = buildSupabaseMock(project, busquedas);

    const result = await findMatchingBusquedas(supabase, PROJECT_ID);

    expect(result.count).toBe(1);
    expect(result.matches[0]?.id).toBe('b5');
  });

  it('returns empty when project has no zone metadata', async () => {
    const project: MockProject = {
      id: PROJECT_ID,
      user_id: ASESOR_ID,
      status: 'rendered',
      source_metadata: { price: 5000000 },
    };
    const busquedas: MockBusqueda[] = [
      {
        id: 'b6',
        lead_id: 'lead-f',
        status: 'activa',
        criteria: { zone: 'Anywhere', price_max: 10000000 },
      },
    ];
    const supabase = buildSupabaseMock(project, busquedas);

    const result = await findMatchingBusquedas(supabase, PROJECT_ID);

    // Sin zone match, b6 no matches.
    expect(result.count).toBe(0);
  });

  it('throws when project not found', async () => {
    const supabase = buildSupabaseMock(null, []);

    await expect(findMatchingBusquedas(supabase, PROJECT_ID)).rejects.toThrow(/not found/);
  });

  it('logs STUB notification payload when matches > 0', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const project: MockProject = {
      id: PROJECT_ID,
      user_id: ASESOR_ID,
      status: 'published',
      source_metadata: { zone: 'Condesa', price: 7000000 },
    };
    const busquedas: MockBusqueda[] = [
      {
        id: 'b7',
        lead_id: 'lead-g',
        status: 'activa',
        criteria: { zone: 'Condesa', price_max: 8000000 },
      },
    ];
    const supabase = buildSupabaseMock(project, busquedas);

    await findMatchingBusquedas(supabase, PROJECT_ID);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[studio.cross-functions.match-busquedas]',
      expect.stringContaining('STUB-NOT-ACTIVE'),
    );
    consoleSpy.mockRestore();
  });
});
