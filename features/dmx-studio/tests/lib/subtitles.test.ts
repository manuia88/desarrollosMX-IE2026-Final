// F14.F.6 Sprint 5 BIBLIA Tarea 5.5 — subtitles tests.

import { describe, expect, it } from 'vitest';

describe('srt-generator', () => {
  it('generates SRT from utterances', async () => {
    const { generateSrt, formatTimecode } = await import(
      '@/features/dmx-studio/lib/subtitles/srt-generator'
    );
    expect(formatTimecode(0)).toBe('00:00:00,000');
    expect(formatTimecode(65.5)).toBe('00:01:05,500');

    const srt = generateSrt({
      utterances: [
        { start: 0, end: 2.5, transcript: 'hola mundo' },
        { start: 2.5, end: 5, transcript: 'segundo bloque' },
      ],
    });
    expect(srt).toContain('1');
    expect(srt).toContain('00:00:00,000 --> 00:00:02,500');
    expect(srt).toContain('hola mundo');
    expect(srt).toContain('2');
    expect(srt).toContain('segundo bloque');
  });

  it('falls back to transcript when no utterances', async () => {
    const { generateSrt } = await import('@/features/dmx-studio/lib/subtitles/srt-generator');
    const srt = generateSrt({ transcript: 'resumen breve' });
    expect(srt).toContain('resumen breve');
  });
});

describe('styles-canon', () => {
  it('exports 5 styles canon', async () => {
    const { SUBTITLE_STYLES } = await import('@/features/dmx-studio/lib/subtitles/styles-canon');
    expect(Object.keys(SUBTITLE_STYLES)).toHaveLength(5);
    expect(SUBTITLE_STYLES.cinematic).toBeDefined();
    expect(SUBTITLE_STYLES.bold).toBeDefined();
    expect(SUBTITLE_STYLES.minimal).toBeDefined();
    expect(SUBTITLE_STYLES.quote).toBeDefined();
    expect(SUBTITLE_STYLES.yellow_hot).toBeDefined();
  });

  it('builds ASS force_style string', async () => {
    const { buildAssForceStyle, getStyle } = await import(
      '@/features/dmx-studio/lib/subtitles/styles-canon'
    );
    const style = getStyle('cinematic');
    const force = buildAssForceStyle(style);
    expect(force).toContain('FontName=');
    expect(force).toContain('FontSize=');
    expect(force).toContain('PrimaryColour=');
    expect(force).toContain('Bold=1');
  });
});
