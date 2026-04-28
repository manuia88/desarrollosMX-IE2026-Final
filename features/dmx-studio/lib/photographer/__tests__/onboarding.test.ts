// F14.F.10 Sprint 9 BIBLIA — Photographer onboarding lib unit tests (Modo A).
// 5 tests: business name validation, slug generation, role assignment, terms acceptance,
// idempotency.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

const fromMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

interface ChainConfig<T> {
  readonly maybeSingle?: QueryResult<T>;
  readonly single?: QueryResult<T>;
  readonly insert?: QueryResult<unknown>;
  readonly update?: QueryResult<T>;
}

function buildChain<T>(config: ChainConfig<T>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn(() => {
      const insertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(config.single ?? { data: null, error: null }),
      };
      return config.insert
        ? Promise.resolve(config.insert)
        : (insertChain as unknown as Record<string, unknown>);
    }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(config.maybeSingle ?? { data: null, error: null }),
    single: vi.fn().mockResolvedValue(config.single ?? { data: null, error: null }),
  };
  return chain;
}

beforeEach(() => {
  fromMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('generatePhotographerSlug', () => {
  it('generates kebab-case slug with random suffix from business name', async () => {
    const { generatePhotographerSlug } = await import('../onboarding');
    const slug = generatePhotographerSlug('Estudio Polanco México');
    expect(slug).toMatch(/^estudio-polanco-mexico-[a-z0-9]+$/);
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});

describe('validateBusinessName', () => {
  it('throws when business name is too short or too long', async () => {
    const { validateBusinessName } = await import('../onboarding');
    expect(() => validateBusinessName('a')).toThrow(/between/);
    expect(() => validateBusinessName('x'.repeat(101))).toThrow(/between/);
    expect(() => validateBusinessName('Estudio Real')).not.toThrow();
  });
});

describe('startPhotographerOnboarding', () => {
  it('inserts new photographer profile + assigns photographer role when no existing row', async () => {
    // Call sequence:
    //   1. select existing studio_photographers (returns null)
    //   2. select studio_users_extension (returns null)
    //   3. insert studio_users_extension
    //   4. insert studio_photographers
    fromMock
      .mockReturnValueOnce(buildChain({ maybeSingle: { data: null, error: null } }))
      .mockReturnValueOnce(buildChain({ maybeSingle: { data: null, error: null } }))
      .mockReturnValueOnce(buildChain({ insert: { data: null, error: null } }))
      .mockReturnValueOnce(
        buildChain({
          single: {
            data: { id: 'photog-uuid-123', slug: 'estudio-test-abc123' },
            error: null,
          },
        }),
      );

    const { startPhotographerOnboarding } = await import('../onboarding');
    const result = await startPhotographerOnboarding('user-uuid-1', {
      businessName: 'Estudio Test',
      email: 'foto@example.com',
    });

    expect(result.created).toBe(true);
    expect(result.photographerId).toBe('photog-uuid-123');
    expect(result.slug).toBe('estudio-test-abc123');
  });

  it('is idempotent — returns existing profile without re-inserting when profile exists', async () => {
    // Call sequence:
    //   1. select existing studio_photographers (returns row)
    //   2. select studio_users_extension (returns photographer role)
    fromMock
      .mockReturnValueOnce(
        buildChain({
          maybeSingle: {
            data: { id: 'photog-existing-uuid', slug: 'mi-estudio-prev' },
            error: null,
          },
        }),
      )
      .mockReturnValueOnce(
        buildChain({
          maybeSingle: {
            data: { user_id: 'user-uuid-2', studio_role: 'studio_photographer' },
            error: null,
          },
        }),
      );

    const { startPhotographerOnboarding } = await import('../onboarding');
    const result = await startPhotographerOnboarding('user-uuid-2', {
      businessName: 'Otra Persona Estudio',
      email: 'foto2@example.com',
    });

    expect(result.created).toBe(false);
    expect(result.photographerId).toBe('photog-existing-uuid');
    expect(result.slug).toBe('mi-estudio-prev');
  });
});

describe('acceptResellerTerms', () => {
  it('updates reseller_terms_accepted_at with ISO timestamp', async () => {
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { acceptResellerTerms } = await import('../onboarding');
    const result = await acceptResellerTerms('user-uuid-7');
    expect(result.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
