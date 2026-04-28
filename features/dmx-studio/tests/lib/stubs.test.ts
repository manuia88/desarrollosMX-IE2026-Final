// F14.F.0 — DMX Studio STUB wrappers tests (ADR-018 4 señales).
// fal-gateway + virtual-staging + seedance activated F14.F.7 Sprint 6 (real wrappers).
// Deepgram activated F14.F.6 Sprint 5.
// HeyGen activated F14.F.8 Sprint 7 (real wrapper, gated por HEYGEN_AVATAR_ENABLED).
// Flux remains STUB Sprint 8+ H2.

import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';

import * as flux from '@/features/dmx-studio/lib/flux';
import * as heygen from '@/features/dmx-studio/lib/heygen';

async function expectNotImplemented(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toThrow(TRPCError);
  await promise.catch((err: unknown) => {
    expect(err).toBeInstanceOf(TRPCError);
    if (err instanceof TRPCError) {
      expect(err.code).toBe('NOT_IMPLEMENTED');
    }
  });
}

describe('dmx-studio/lib/heygen real wrapper (F14.F.8)', () => {
  it('testConnection returns ok=false sin API key configurada', async () => {
    const original = process.env.HEYGEN_API_KEY;
    process.env.HEYGEN_API_KEY = '';
    try {
      const result = await heygen.testConnection();
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/HEYGEN_API_KEY/);
    } finally {
      process.env.HEYGEN_API_KEY = original;
    }
  });
});

describe('dmx-studio/lib/flux STUB', () => {
  it('generateFrame throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(flux.generateFrame({}));
  });

  it('upscale throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(flux.upscale({}));
  });

  it('testConnection returns ok:false with reason', async () => {
    const result = await flux.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('STUB H2 Sprint 6 Flux frame+upscale');
  });
});
