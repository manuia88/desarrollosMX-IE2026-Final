import { describe, expect, it, vi } from 'vitest';

// Modo A integration test: createCaller-style with createAdminClient mocked.
// Defer Modo B (real DB + JWT RLS) to dedicated sub-bloque RLS hardening.

vi.mock('@/shared/lib/supabase/admin', () => {
  const fromMock = vi.fn();
  return {
    createAdminClient: vi.fn(() => ({ from: fromMock })),
    __fromMock: fromMock,
  };
});

describe('captacionesRouter — integration smoke (Modo A mocks)', () => {
  it('FSM matrix rejects illegal transition through schema layer', async () => {
    const { isValidTransition } = await import('../schemas');
    expect(isValidTransition('prospecto', 'firmado')).toBe(false);
    expect(isValidTransition('prospecto', 'presentacion')).toBe(true);
    expect(isValidTransition('en_promocion', 'vendido')).toBe(true);
  });

  it.skip('STUB — activar FASE 14 mifiel firma proc', () => {
    // pending Mifiel proc to be added once contracts are wired
  });

  it.skip('STUB — activar FASE 14 vision classify upload proc', () => {
    // pending vision-classify gateway integration
  });
});
