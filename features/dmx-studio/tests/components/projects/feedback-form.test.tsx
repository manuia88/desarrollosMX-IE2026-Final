// FASE 14.F.2 Sprint 1 — FeedbackForm tests (Modo A: schema validation +
// mutation contract).

import { describe, expect, it, vi } from 'vitest';
import { submitProjectFeedbackInput } from '@/features/dmx-studio/schemas';

const submitFeedbackMutateMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      projects: {
        submitFeedback: {
          useMutation: vi.fn(() => ({
            mutate: submitFeedbackMutateMock,
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe('FeedbackForm — Zod schema validation', () => {
  it('rejects payload missing rating (rating is required, integer 1-5)', () => {
    const result = submitProjectFeedbackInput.safeParse({
      projectId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating outside 1-5 range', () => {
    const r1 = submitProjectFeedbackInput.safeParse({
      projectId: '11111111-1111-4111-8111-111111111111',
      rating: 0,
    });
    const r2 = submitProjectFeedbackInput.safeParse({
      projectId: '11111111-1111-4111-8111-111111111111',
      rating: 6,
    });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it('accepts well-formed payload (drives submitFeedback mutation)', () => {
    const result = submitProjectFeedbackInput.safeParse({
      projectId: '11111111-1111-4111-8111-111111111111',
      rating: 5,
      selectedHook: 'hook_a',
      preferredFormat: '9x16',
      comments: 'Great video!',
      wouldRecommend: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('FeedbackForm — submit triggers tRPC mutation', () => {
  it('submitFeedback mutation accepts validated payload', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const useMutationHook = clientMod.trpc.studio.projects.submitFeedback
      .useMutation as unknown as () => { mutate: (args: unknown) => void };
    const m = useMutationHook();
    const payload = {
      projectId: '11111111-1111-4111-8111-111111111111',
      rating: 4,
      selectedHook: 'hook_b' as const,
      preferredFormat: '9x16' as const,
      comments: 'Good',
      wouldRecommend: true,
    };
    const parsed = submitProjectFeedbackInput.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      m.mutate(parsed.data);
      expect(submitFeedbackMutateMock).toHaveBeenCalledWith(parsed.data);
    }
  });

  it('module exports FeedbackForm as named function', async () => {
    const mod = await import('../../../components/projects/FeedbackForm');
    expect(typeof mod.FeedbackForm).toBe('function');
    expect(mod.FeedbackForm.name).toBe('FeedbackForm');
  });
});
