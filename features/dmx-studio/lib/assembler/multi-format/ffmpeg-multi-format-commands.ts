// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — Multi-format FFmpeg shell command
// builders (pure). Reformat 9:16 source into 16:9 / 1:1 via scale + crop + pad.
// Reuses the canon quote helper style from features/dmx-studio/lib/assembler/
// ffmpeg-commands.ts (Sprint 1). Keeps codec / pixfmt / audio params consistent
// so output renders are interchangeable downstream.

const VIDEO_BITRATE = '24M';
const VIDEO_FRAMERATE = 30;
const VIDEO_CODEC = 'libx264';
const AUDIO_CODEC = 'aac';
const AUDIO_BITRATE = '192k';
const PIXEL_FORMAT = 'yuv420p';

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

/**
 * Build a generic reformat command that scales the source while preserving
 * aspect ratio (decrease), then center-crops to the exact target dimensions
 * and pads remaining area with black. Audio stream is re-encoded to keep the
 * output container standard across all formats.
 */
export function buildReformatCommand(
  sourcePath: string,
  targetWidth: number,
  targetHeight: number,
  outputPath: string,
): string {
  const vf = [
    `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase`,
    `crop=${targetWidth}:${targetHeight}`,
    `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black`,
    'setsar=1',
  ].join(',');

  return [
    'ffmpeg',
    '-y',
    `-i ${quote(sourcePath)}`,
    '-vf',
    quote(vf),
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-r ${VIDEO_FRAMERATE}`,
    `-b:v ${VIDEO_BITRATE}`,
    `-c:a ${AUDIO_CODEC}`,
    `-b:a ${AUDIO_BITRATE}`,
    quote(outputPath),
  ].join(' ');
}

export const __test__ = {
  VIDEO_BITRATE,
  VIDEO_FRAMERATE,
  VIDEO_CODEC,
  AUDIO_CODEC,
  AUDIO_BITRATE,
  PIXEL_FORMAT,
  quote,
};
