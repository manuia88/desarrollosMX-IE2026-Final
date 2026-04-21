import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/posthog', () => ({
  posthog: { capture: vi.fn() },
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

import { posthog } from '@/shared/lib/telemetry/posthog';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { reportCausalFailure, trackCausalGeneration } from '../lib/observability';

describe('trackCausalGeneration', () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockClear();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('calls posthog.capture with the causal.generated event and mapped properties', () => {
    trackCausalGeneration({
      scoreId: 'score-1',
      indexCode: 'IPV',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      model: 'claude-sonnet-4-5',
      promptVersion: 'v1',
      tokensIn: 1500,
      tokensOut: 500,
      costUsd: 0.0123,
      cached: false,
      durationMs: 1800,
    });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
    const call = vi.mocked(posthog.capture).mock.calls[0]?.[0];
    expect(call?.event).toBe('causal.generated');
    expect(call?.distinctId).toBe('server');
    expect(call?.properties).toEqual({
      score_id: 'score-1',
      index_code: 'IPV',
      scope_type: 'colonia',
      scope_id: 'roma-norte',
      model: 'claude-sonnet-4-5',
      prompt_version: 'v1',
      tokens_in: 1500,
      tokens_out: 500,
      cost_usd: 0.0123,
      cached: false,
      duration_ms: 1800,
    });
  });

  it('uses the provided distinctId when given', () => {
    trackCausalGeneration(
      {
        scoreId: 'score-2',
        indexCode: 'IPV',
        scopeType: 'city',
        scopeId: 'CDMX',
        model: 'claude-sonnet-4-5',
        promptVersion: 'v1',
        tokensIn: 100,
        tokensOut: 50,
        costUsd: 0.001,
        cached: true,
        durationMs: 10,
      },
      'user-42',
    );

    const call = vi.mocked(posthog.capture).mock.calls[0]?.[0];
    expect(call?.distinctId).toBe('user-42');
  });
});

describe('reportCausalFailure', () => {
  beforeEach(() => {
    vi.mocked(sentry.captureException).mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('forwards the error to sentry.captureException with correct tags and extra', () => {
    const err = new Error('llm timeout');
    reportCausalFailure({
      scoreId: 'score-9',
      model: 'claude-sonnet-4-5',
      reason: 'llm_call_failed',
      error: err,
    });

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    const [capturedErr, ctx] = vi.mocked(sentry.captureException).mock.calls[0] ?? [];
    expect(capturedErr).toBe(err);
    expect(ctx?.tags).toEqual({
      feature: 'causal-engine',
      reason: 'llm_call_failed',
      model: 'claude-sonnet-4-5',
    });
    expect(ctx?.extra).toEqual({ score_id: 'score-9' });
  });

  it('omits model tag when model is not provided', () => {
    reportCausalFailure({
      scoreId: 'score-no-model',
      reason: 'validation_failed',
      error: new Error('bad output'),
    });

    const [, ctx] = vi.mocked(sentry.captureException).mock.calls[0] ?? [];
    expect(ctx?.tags).toEqual({
      feature: 'causal-engine',
      reason: 'validation_failed',
    });
    expect(ctx?.tags?.model).toBeUndefined();
  });
});
