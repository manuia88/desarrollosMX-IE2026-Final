// FASE 14.F.2 Sprint 1 — FFmpeg shell command builders (Tarea 1.6 BIBLIA).
// Pure functions returning shell command strings — sandbox executes them.
// Quoted args use double-quotes con escape básico para inputs filename/text.
//
// Canon export 9:16 = 1080x1920 H.264 ~24Mbps 30fps; crossfade 0.5s default;
// background music duck -20dB under voice via sidechaincompress.

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
 * Build FFmpeg command that concatenates a list of video clips into a single
 * output (uses concat demuxer via list file). Returns full shell command string
 * including the concat list file generation step.
 */
export function buildConcatCommand(clipPaths: ReadonlyArray<string>, outputPath: string): string {
  if (clipPaths.length === 0) {
    throw new Error('buildConcatCommand: clipPaths cannot be empty');
  }
  const listFile = `${outputPath}.concat.txt`;
  const listContent = clipPaths.map((p) => `file ${quote(p)}`).join('\n');
  const writeList = `printf '%s\\n' ${quote(listContent)} > ${quote(listFile)}`;
  const concat = [
    'ffmpeg',
    '-y',
    '-f concat',
    '-safe 0',
    `-i ${quote(listFile)}`,
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-r ${VIDEO_FRAMERATE}`,
    `-b:v ${VIDEO_BITRATE}`,
    quote(outputPath),
  ].join(' ');
  return `${writeList} && ${concat}`;
}

/**
 * Overlay narration audio (ElevenLabs voice) on top of an existing video.
 * Output replaces audio track; original video audio preserved as background base.
 */
export function buildOverlayNarrationCommand(
  videoPath: string,
  narrationPath: string,
  outputPath: string,
): string {
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    `-i ${quote(narrationPath)}`,
    '-filter_complex',
    quote(
      '[0:a]volume=0.0[base];[1:a]volume=1.0[narr];[base][narr]amix=inputs=2:duration=first[aout]',
    ),
    '-map 0:v',
    '-map "[aout]"',
    `-c:v copy`,
    `-c:a ${AUDIO_CODEC}`,
    `-b:a ${AUDIO_BITRATE}`,
    quote(outputPath),
  ].join(' ');
}

/**
 * Mix background music with current audio track applying ducking (-20dB under
 * voice). duckDb negative number expected (e.g. -20).
 */
export function buildMusicMixCommand(
  videoPath: string,
  musicPath: string,
  duckDb: number,
  outputPath: string,
): string {
  const musicVolumeLinear = 10 ** (duckDb / 20);
  const filter = [
    `[1:a]volume=${musicVolumeLinear.toFixed(4)}[music]`,
    `[0:a][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
  ].join(';');
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    `-i ${quote(musicPath)}`,
    '-filter_complex',
    quote(filter),
    '-map 0:v',
    '-map "[aout]"',
    `-c:v copy`,
    `-c:a ${AUDIO_CODEC}`,
    `-b:a ${AUDIO_BITRATE}`,
    quote(outputPath),
  ].join(' ');
}

/**
 * Apply crossfade transitions between clips. fadeDuration in seconds (e.g. 0.5).
 * For single-clip input acts as no-op pass-through encode.
 */
export function buildCrossfadeCommand(
  videoPath: string,
  fadeDuration: number,
  outputPath: string,
): string {
  const fade = Math.max(0.05, fadeDuration);
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    '-vf',
    quote(`fade=t=in:st=0:d=${fade.toFixed(2)},fade=t=out:st=0:d=${fade.toFixed(2)}`),
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-c:a copy`,
    quote(outputPath),
  ].join(' ');
}

/**
 * Export final 9:16 video at 1080x1920 with hook overlay text rendered into
 * first 3 seconds. drawtext font defaults to system DejaVu Sans Bold.
 */
export function buildExport9x16Command(
  videoPath: string,
  outputPath: string,
  hookOverlayText: string,
): string {
  const safeText = hookOverlayText.replace(/'/g, "\\'").replace(/:/g, '\\:');
  const drawtext = [
    `drawtext=text='${safeText}'`,
    `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
    `fontsize=72`,
    `fontcolor=white`,
    `borderw=4`,
    `bordercolor=black@0.6`,
    `x=(w-text_w)/2`,
    `y=h*0.18`,
    `enable='between(t,0,3)'`,
  ].join(':');
  const vf = [
    `scale=1080:1920:force_original_aspect_ratio=decrease`,
    `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black`,
    `setsar=1`,
    drawtext,
  ].join(',');
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
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
