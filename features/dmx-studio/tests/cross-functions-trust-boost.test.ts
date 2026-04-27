// FASE 14.F.4 Sprint 3 — Cross-function 5 (UPGRADE 10 LATERAL) tests:
// trust-score-boost stub canon + calculateStudioCopyPackBonus thresholds.
// Modo A: pure-function tests con mocked Supabase chain. Cero red, cero créditos.

import { describe, expect, it, vi } from 'vitest';
import {
  applyTrustScoreBoostFromStudio,
  calculateStudioCopyPackBonus,
  STUDIO_COPY_PACK_BONUS_POINTS,
  STUDIO_COPY_PACK_BONUS_THRESHOLD_PROJECTS,
  STUDIO_TRUST_BOOST_POINTS,
} from '@/features/dmx-studio/lib/cross-functions/trust-score-boost';

const DEV_ID = '55555555-5555-5555-5555-555555555555';

interface MockState {
  profiles?: Array<{ id: string }>;
  projectsCount?: number;
  projects?: Array<{ id: string }>;
  copyOutputs?: Array<{ id: string; project_id: string }>;
  copyVersionsCount?: number;
  errorOn?: string;
}

function buildSupabaseMock(state: MockState) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => {
              if (state.errorOn === 'profiles') {
                return { data: null, error: { message: 'profiles err' } };
              }
              return { data: state.profiles ?? [], error: null };
            }),
          })),
        };
      }
      if (table === 'studio_video_projects') {
        return {
          select: vi.fn((_cols: string, opts?: { count?: string; head?: boolean }) => ({
            in: vi.fn(() => ({
              eq: vi.fn(async () => {
                if (opts?.count === 'exact' && opts?.head !== true) {
                  return {
                    data: state.projects ?? [],
                    count: state.projectsCount ?? state.projects?.length ?? 0,
                    error: null,
                  };
                }
                if (opts?.count === 'exact') {
                  return {
                    data: null,
                    count: state.projectsCount ?? 0,
                    error: null,
                  };
                }
                return {
                  data: state.projects ?? [],
                  error: null,
                };
              }),
            })),
          })),
        };
      }
      if (table === 'studio_copy_outputs') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: state.copyOutputs ?? [],
              error: null,
            })),
          })),
        };
      }
      if (table === 'studio_copy_versions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: null,
              count: state.copyVersionsCount ?? 0,
              error: null,
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface for tests
  } as any;
}

describe('applyTrustScoreBoostFromStudio', () => {
  it('returns STUB result not applied with canonical message + boost points constant', async () => {
    const result = await applyTrustScoreBoostFromStudio({}, DEV_ID);
    expect(result.applied).toBe(false);
    expect(result.boostPoints).toBe(STUDIO_TRUST_BOOST_POINTS);
    expect(result.reason).toContain('STUB-NOT-ACTIVE');
    expect(result.reason).toContain('L-NEW-STUDIO-TRUST-BOOST');
  });
});

describe('calculateStudioCopyPackBonus', () => {
  it('returns 2 pts when criteria all met (>=5 published + complete copy outputs + regeneration)', async () => {
    const projects = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}` }));
    const copyOutputs = projects.map((p) => ({ id: `o-${p.id}`, project_id: p.id }));
    const supabase = buildSupabaseMock({
      profiles: [{ id: 'u1' }],
      projects,
      projectsCount: projects.length,
      copyOutputs,
      // regeneration: more versions than outputs (each output has at least one extra version).
      copyVersionsCount: copyOutputs.length + 3,
    });

    const result = await calculateStudioCopyPackBonus(supabase, DEV_ID);

    expect(result.bonusPoints).toBe(STUDIO_COPY_PACK_BONUS_POINTS);
    expect(result.publishedProjectsCount).toBe(6);
    expect(result.hasCompleteCopyPacks).toBe(true);
    expect(result.hasCopyRegeneration).toBe(true);
    expect(result.reason).toContain('criteria-met-stub-not-applied');
  });

  it('returns 0 pts when published projects < threshold (5)', async () => {
    const projects = [{ id: 'p1' }, { id: 'p2' }];
    const supabase = buildSupabaseMock({
      profiles: [{ id: 'u1' }],
      projects,
      projectsCount: 2,
    });

    const result = await calculateStudioCopyPackBonus(supabase, DEV_ID);

    expect(result.bonusPoints).toBe(0);
    expect(result.publishedProjectsCount).toBe(2);
    expect(result.reason).toContain('STUB-NOT-ACTIVE');
    expect(STUDIO_COPY_PACK_BONUS_THRESHOLD_PROJECTS).toBe(5);
  });

  it('returns 0 pts when threshold met but no copy regeneration signal', async () => {
    const projects = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` }));
    const copyOutputs = projects.map((p) => ({ id: `o-${p.id}`, project_id: p.id }));
    const supabase = buildSupabaseMock({
      profiles: [{ id: 'u1' }],
      projects,
      projectsCount: projects.length,
      copyOutputs,
      copyVersionsCount: copyOutputs.length, // exactamente igual = no regeneration extra.
    });

    const result = await calculateStudioCopyPackBonus(supabase, DEV_ID);

    expect(result.bonusPoints).toBe(0);
    expect(result.hasCompleteCopyPacks).toBe(true);
    expect(result.hasCopyRegeneration).toBe(false);
  });

  it('returns 0 pts when desarrolladora has no users', async () => {
    const supabase = buildSupabaseMock({ profiles: [] });

    const result = await calculateStudioCopyPackBonus(supabase, DEV_ID);

    expect(result.bonusPoints).toBe(0);
    expect(result.publishedProjectsCount).toBe(0);
    expect(result.reason).toBe('no-users-for-desarrolladora');
  });

  it('throws when profiles query errors', async () => {
    const supabase = buildSupabaseMock({ errorOn: 'profiles' });

    await expect(calculateStudioCopyPackBonus(supabase, DEV_ID)).rejects.toThrow(
      /profiles fetch failed/,
    );
  });
});
