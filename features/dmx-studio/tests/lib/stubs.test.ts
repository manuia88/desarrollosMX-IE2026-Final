// FASE 14.F.0 — DMX Studio STUB wrappers tests (ADR-018 4 señales).
// Valida 6 wrappers STUB: fal-gateway, heygen, virtual-staging, flux, deepgram, seedance.
// Cada wrapper: función principal throw TRPCError NOT_IMPLEMENTED + testConnection ok:false + reason.

import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';

import * as deepgram from '@/features/dmx-studio/lib/deepgram';
import * as falGateway from '@/features/dmx-studio/lib/fal-gateway';
import * as flux from '@/features/dmx-studio/lib/flux';
import * as heygen from '@/features/dmx-studio/lib/heygen';
import * as seedance from '@/features/dmx-studio/lib/seedance';
import * as virtualStaging from '@/features/dmx-studio/lib/virtual-staging';

async function expectNotImplemented(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toThrow(TRPCError);
  await promise.catch((err: unknown) => {
    expect(err).toBeInstanceOf(TRPCError);
    if (err instanceof TRPCError) {
      expect(err.code).toBe('NOT_IMPLEMENTED');
    }
  });
}

describe('dmx-studio/lib/fal-gateway STUB', () => {
  it('generateFromModel throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(falGateway.generateFromModel('seedance', {}));
  });

  it('testConnection returns ok:false with reason', async () => {
    const result = await falGateway.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Sprint 6');
    expect(result.reason).toContain('fal-gateway');
  });
});

describe('dmx-studio/lib/heygen STUB', () => {
  it('generateAvatarVideo throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(heygen.generateAvatarVideo({}));
  });

  it('testConnection returns ok:false with reason', async () => {
    const result = await heygen.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('STUB H2 Sprint 7 HeyGen avatar');
  });
});

describe('dmx-studio/lib/virtual-staging STUB', () => {
  it('stageRoom throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(
      virtualStaging.stageRoom({ imageUrl: 'https://example.com/x.jpg', style: 'modern' }),
    );
  });

  it('testConnection returns ok:false with reason', async () => {
    const result = await virtualStaging.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('STUB H2 Sprint 6 Virtual Staging');
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

describe('dmx-studio/lib/deepgram STUB', () => {
  it('transcribeAudio throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(deepgram.transcribeAudio({ audioUrl: 'https://example.com/a.mp3' }));
  });

  it('testConnection returns ok:false with reason', async () => {
    const result = await deepgram.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('STUB H2 Sprint 5 Deepgram transcription');
  });
});

describe('dmx-studio/lib/seedance STUB', () => {
  it('generateVideoWithAudio throws TRPCError NOT_IMPLEMENTED', async () => {
    await expectNotImplemented(seedance.generateVideoWithAudio({}));
  });

  it('testConnection returns ok:false with reason', async () => {
    const result = await seedance.testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('STUB H2 Sprint 6 Seedance via fal.ai');
  });
});
