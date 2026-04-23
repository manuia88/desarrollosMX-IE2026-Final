import { beforeEach, describe, expect, it, vi } from 'vitest';

type UpdatePayload = { views_count: number };
const updateSpy = vi.fn<(p: UpdatePayload) => Promise<{ error: null }>>(() =>
  Promise.resolve({ error: null }),
);

interface SelectResult {
  readonly data: { id: string; views_count: number } | null;
  readonly error: null;
}

const selectResult: { current: SelectResult } = {
  current: { data: { id: 'row-1', views_count: 3 }, error: null },
};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(selectResult.current),
          }),
        }),
      }),
      update: (p: UpdatePayload) => ({
        eq: () => updateSpy(p),
      }),
    }),
  }),
}));

describe('trackEmbedView', () => {
  beforeEach(() => {
    updateSpy.mockClear();
    selectResult.current = { data: { id: 'row-1', views_count: 3 }, error: null };
  });

  it('is a no-op when embedId is missing', async () => {
    const { trackEmbedView } = await import('../lib/tracking');
    await trackEmbedView({ scopeType: 'colonia', scopeId: 'roma-norte' });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('increments views_count when row exists', async () => {
    const { trackEmbedView } = await import('../lib/tracking');
    await trackEmbedView({
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      embedId: 'abc123',
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]?.[0]).toEqual({ views_count: 4 });
  });

  it('skips update when row does not exist', async () => {
    selectResult.current = { data: null, error: null };
    const { trackEmbedView } = await import('../lib/tracking');
    await trackEmbedView({
      scopeType: 'colonia',
      scopeId: 'unknown',
      embedId: 'ghost',
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('silently swallows errors from admin client creation', async () => {
    vi.resetModules();
    vi.doMock('@/shared/lib/supabase/admin', () => ({
      createAdminClient: () => {
        throw new Error('env missing');
      },
    }));
    const { trackEmbedView: t2 } = await import('../lib/tracking');
    await expect(
      t2({ scopeType: 'colonia', scopeId: 'roma-norte', embedId: 'x' }),
    ).resolves.toBeUndefined();
    vi.doUnmock('@/shared/lib/supabase/admin');
  });
});
