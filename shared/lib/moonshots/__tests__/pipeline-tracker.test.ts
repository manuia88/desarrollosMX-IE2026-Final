import { describe, expect, it, vi } from 'vitest';
import { listPipelineSnapshots, snapshotAllProjectsForCron } from '../pipeline-tracker';

describe('pipeline-tracker', () => {
  it('snapshotAllProjectsForCron returns 0 processed when no projects', async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })),
    };
    const result = await snapshotAllProjectsForCron(
      supabase as unknown as Parameters<typeof snapshotAllProjectsForCron>[0],
    );
    expect(result.projectsProcessed).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('listPipelineSnapshots returns empty when no snapshots', async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })),
    };
    const rows = await listPipelineSnapshots(
      supabase as unknown as Parameters<typeof listPipelineSnapshots>[0],
      'dev-1',
      30,
    );
    expect(rows).toEqual([]);
  });
});
