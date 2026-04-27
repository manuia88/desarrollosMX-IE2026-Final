// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — Multi-format lib pure tests.
// Modo A: zero red dependencies. Asserts smart-crop heuristic + beat-sync
// determinism + ffmpeg builder shape.

import { describe, expect, it } from 'vitest';
import {
  alignTransitionsToBeats,
  buildBeatSyncFilter,
  detectBeats,
} from '../lib/assembler/multi-format/beat-sync';
import { buildCropCommand, detectFocalArea } from '../lib/assembler/multi-format/smart-crop';

describe('multi-format/smart-crop — detectFocalArea', () => {
  it('returns center-anchored canvas region for canon 1080x1920 source', () => {
    const focal = detectFocalArea('/tmp/source_9x16.mp4');
    expect(focal).toEqual({ x: 0, y: 0, width: 1080, height: 1920 });
  });
});

describe('multi-format/smart-crop — buildCropCommand', () => {
  const focal = { x: 0, y: 0, width: 1080, height: 1920 };

  it('builds 16x9 reformat command with scale + crop + pad to 1920x1080', () => {
    const cmd = buildCropCommand('/tmp/in.mp4', '16x9', focal, '/tmp/out.mp4');
    expect(cmd).toContain('ffmpeg');
    expect(cmd).toContain('1920');
    expect(cmd).toContain('1080');
    expect(cmd).toContain('scale=');
    expect(cmd).toContain('crop=');
    expect(cmd).toContain('pad=');
  });

  it('builds 1x1 reformat command with scale + crop + pad to 1080x1080', () => {
    const cmd = buildCropCommand('/tmp/in.mp4', '1x1', focal, '/tmp/out.mp4');
    expect(cmd).toContain('ffmpeg');
    expect(cmd).toContain('crop=1080:1080');
    expect(cmd).toContain('pad=1080:1080');
  });
});

describe('multi-format/beat-sync — detectBeats', () => {
  it('with bpm=120 returns evenly-spaced 0.5s timestamps capped by duration', () => {
    const beats = detectBeats({ bpm: 120, durationSeconds: 4 });
    expect(beats.length).toBeGreaterThan(1);
    expect(beats[0]).toBeCloseTo(0, 3);
    expect(beats[1]).toBeCloseTo(0.5, 3);
    expect(beats[2]).toBeCloseTo(1, 3);
    expect(beats[beats.length - 1] as number).toBeLessThanOrEqual(4);
  });

  it('without bpm falls back to 0.5s interval (≈120 BPM)', () => {
    const beats = detectBeats({ durationSeconds: 4 });
    expect(beats[0]).toBeCloseTo(0, 3);
    expect(beats[1]).toBeCloseTo(0.5, 3);
    expect(beats[2]).toBeCloseTo(1, 3);
  });
});

describe('multi-format/beat-sync — alignTransitionsToBeats', () => {
  it('snaps each clip-end timestamp to nearest beat (returns original when beats empty)', () => {
    const beats = [0, 0.5, 1, 1.5, 2];
    const snapped = alignTransitionsToBeats([0.6, 1.4, 1.9], beats);
    expect(snapped).toEqual([0.5, 1.5, 2]);

    const passthrough = alignTransitionsToBeats([0.6, 1.4], []);
    expect(passthrough).toEqual([0.6, 1.4]);
  });
});

describe('multi-format/beat-sync — buildBeatSyncFilter shape', () => {
  it('returns null filter when no beats; emits chained fades when populated', () => {
    expect(buildBeatSyncFilter([])).toBe('null');
    const out = buildBeatSyncFilter([0, 0.5, 1]);
    expect(out).toContain('fade=t=in');
    expect(out.split('fade=t=in').length - 1).toBe(3);
  });
});
