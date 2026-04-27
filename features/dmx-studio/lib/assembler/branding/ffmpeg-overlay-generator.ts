// FASE 14.F.3 Sprint 2 — FFmpeg branding overlay shell command builders.
// Pure functions returning shell command strings (NO sandbox execution aquí).
// Logo overlay esquina inferior derecha (alpha 0.85) + bottom bar últimos 3s
// (drawbox + drawtext nombre+phone) + intro/outro drawtext con enable timing.

const VIDEO_CODEC = 'libx264';
const AUDIO_CODEC = 'aac';
const PIXEL_FORMAT = 'yuv420p';
const FONT_FILE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const LOGO_SIZE = 120;
const LOGO_MARGIN = 30;
const LOGO_ALPHA = 0.85;
const BOTTOM_BAR_HEIGHT = 110;
const BOTTOM_BAR_DURATION = 3;
const INTRO_DURATION = 3;
const OUTRO_DURATION = 3;

export type LogoPosition = 'bottom-right' | 'top-left';

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function escapeDrawText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}

function logoOverlayPosition(position: LogoPosition): string {
  if (position === 'top-left') {
    return `${LOGO_MARGIN}:${LOGO_MARGIN}`;
  }
  return `W-w-${LOGO_MARGIN}:H-h-${LOGO_MARGIN}`;
}

/**
 * Overlay logo image (PNG con transparencia) sobre el video en posición
 * configurable. Default bottom-right con alpha 0.85.
 */
export function buildLogoOverlayCommand(
  videoPath: string,
  logoPath: string,
  outputPath: string,
  position: LogoPosition,
): string {
  const overlayCoords = logoOverlayPosition(position);
  const filter = [
    `[1:v]scale=${LOGO_SIZE}:${LOGO_SIZE}[lg]`,
    `[0:v][lg]overlay=${overlayCoords}:format=auto:alpha=${LOGO_ALPHA}[v]`,
  ].join(';');
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    `-i ${quote(logoPath)}`,
    '-filter_complex',
    quote(filter),
    '-map "[v]"',
    '-map 0:a?',
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-c:a ${AUDIO_CODEC}`,
    quote(outputPath),
  ].join(' ');
}

/**
 * Bottom bar últimos 3 segundos del video con drawbox + drawtext (nombre +
 * phone). brandColor en formato CSS (#RRGGBB). durationSeconds permite calcular
 * timestamp inicio bar (durationSeconds - 3).
 */
export function buildBottomBarCommand(
  videoPath: string,
  name: string,
  phone: string,
  brandColor: string,
  durationSeconds: number,
  outputPath: string,
): string {
  const start = Math.max(0, durationSeconds - BOTTOM_BAR_DURATION);
  const end = durationSeconds;
  const enable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
  const safeName = escapeDrawText(name);
  const safePhone = escapeDrawText(phone);
  const drawbox = [
    'drawbox=x=0',
    `y=h-${BOTTOM_BAR_HEIGHT}`,
    'w=w',
    `h=${BOTTOM_BAR_HEIGHT}`,
    `color=${brandColor}@0.92`,
    't=fill',
    enable,
  ].join(':');
  const drawtextName = [
    `drawtext=text='${safeName}'`,
    `fontfile=${FONT_FILE}`,
    'fontsize=42',
    'fontcolor=white',
    'x=(w-text_w)/2',
    `y=h-${BOTTOM_BAR_HEIGHT}+18`,
    enable,
  ].join(':');
  const drawtextPhone = [
    `drawtext=text='${safePhone}'`,
    `fontfile=${FONT_FILE}`,
    'fontsize=30',
    'fontcolor=white',
    'x=(w-text_w)/2',
    `y=h-${BOTTOM_BAR_HEIGHT}+66`,
    enable,
  ].join(':');
  const vf = [drawbox, drawtextName, drawtextPhone].join(',');
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    '-vf',
    quote(vf),
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-c:a copy`,
    quote(outputPath),
  ].join(' ');
}

/**
 * Intro y/o outro drawtext overlay. Intro entre t=0..3, outro entre
 * t=duration-3..duration. Si introText o outroText es null se omite el drawtext
 * correspondiente. Si ambos son null devuelve un re-encode pasthrough seguro.
 */
export function buildIntroOutroOverlayCommand(
  videoPath: string,
  introText: string | null,
  outroText: string | null,
  outputPath: string,
): string {
  const filters: string[] = [];
  if (introText) {
    const safe = escapeDrawText(introText);
    filters.push(
      [
        `drawtext=text='${safe}'`,
        `fontfile=${FONT_FILE}`,
        'fontsize=58',
        'fontcolor=white',
        'borderw=3',
        'bordercolor=black@0.6',
        'x=(w-text_w)/2',
        'y=h*0.10',
        `enable='between(t,0,${INTRO_DURATION})'`,
      ].join(':'),
    );
  }
  if (outroText) {
    const safe = escapeDrawText(outroText);
    filters.push(
      [
        `drawtext=text='${safe}'`,
        `fontfile=${FONT_FILE}`,
        'fontsize=58',
        'fontcolor=white',
        'borderw=3',
        'bordercolor=black@0.6',
        'x=(w-text_w)/2',
        'y=h*0.10',
        `enable='between(t,duration-${OUTRO_DURATION},duration)'`,
      ].join(':'),
    );
  }
  const vf = filters.length > 0 ? filters.join(',') : 'null';
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    '-vf',
    quote(vf),
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-c:a copy`,
    quote(outputPath),
  ].join(' ');
}

export interface FullBrandingInput {
  readonly videoPath: string;
  readonly logoPath: string | null;
  readonly name: string | null;
  readonly phone: string | null;
  readonly brandColor: string;
  readonly durationSeconds: number;
  readonly outputPath: string;
  readonly introText?: string | null;
  readonly outroText?: string | null;
}

/**
 * Combina logo + bottom bar (cuando name+phone disponibles) + intro/outro
 * (opcional) en una sola pasada FFmpeg. Cuando logo es null usa filter_complex
 * solo con drawbox/drawtext sin segundo input.
 */
export function buildFullBrandingCommand(input: FullBrandingInput): string {
  const {
    videoPath,
    logoPath,
    name,
    phone,
    brandColor,
    durationSeconds,
    outputPath,
    introText,
    outroText,
  } = input;

  const start = Math.max(0, durationSeconds - BOTTOM_BAR_DURATION);
  const end = durationSeconds;
  const barEnable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;

  const drawFilters: string[] = [];

  if (name && phone) {
    drawFilters.push(
      [
        'drawbox=x=0',
        `y=h-${BOTTOM_BAR_HEIGHT}`,
        'w=w',
        `h=${BOTTOM_BAR_HEIGHT}`,
        `color=${brandColor}@0.92`,
        't=fill',
        barEnable,
      ].join(':'),
    );
    drawFilters.push(
      [
        `drawtext=text='${escapeDrawText(name)}'`,
        `fontfile=${FONT_FILE}`,
        'fontsize=42',
        'fontcolor=white',
        'x=(w-text_w)/2',
        `y=h-${BOTTOM_BAR_HEIGHT}+18`,
        barEnable,
      ].join(':'),
    );
    drawFilters.push(
      [
        `drawtext=text='${escapeDrawText(phone)}'`,
        `fontfile=${FONT_FILE}`,
        'fontsize=30',
        'fontcolor=white',
        'x=(w-text_w)/2',
        `y=h-${BOTTOM_BAR_HEIGHT}+66`,
        barEnable,
      ].join(':'),
    );
  }

  if (introText) {
    drawFilters.push(
      [
        `drawtext=text='${escapeDrawText(introText)}'`,
        `fontfile=${FONT_FILE}`,
        'fontsize=58',
        'fontcolor=white',
        'borderw=3',
        'bordercolor=black@0.6',
        'x=(w-text_w)/2',
        'y=h*0.10',
        `enable='between(t,0,${INTRO_DURATION})'`,
      ].join(':'),
    );
  }
  if (outroText) {
    drawFilters.push(
      [
        `drawtext=text='${escapeDrawText(outroText)}'`,
        `fontfile=${FONT_FILE}`,
        'fontsize=58',
        'fontcolor=white',
        'borderw=3',
        'bordercolor=black@0.6',
        'x=(w-text_w)/2',
        'y=h*0.10',
        `enable='between(t,${Math.max(0, durationSeconds - OUTRO_DURATION).toFixed(2)},${durationSeconds.toFixed(2)})'`,
      ].join(':'),
    );
  }

  if (logoPath) {
    const overlayCoords = logoOverlayPosition('bottom-right');
    const drawChain = drawFilters.length > 0 ? drawFilters.join(',') : 'null';
    const filter = [
      `[0:v]${drawChain}[base]`,
      `[1:v]scale=${LOGO_SIZE}:${LOGO_SIZE}[lg]`,
      `[base][lg]overlay=${overlayCoords}:format=auto:alpha=${LOGO_ALPHA}[v]`,
    ].join(';');
    return [
      'ffmpeg',
      '-y',
      `-i ${quote(videoPath)}`,
      `-i ${quote(logoPath)}`,
      '-filter_complex',
      quote(filter),
      '-map "[v]"',
      '-map 0:a?',
      `-c:v ${VIDEO_CODEC}`,
      `-pix_fmt ${PIXEL_FORMAT}`,
      `-c:a ${AUDIO_CODEC}`,
      quote(outputPath),
    ].join(' ');
  }

  const vf = drawFilters.length > 0 ? drawFilters.join(',') : 'null';
  return [
    'ffmpeg',
    '-y',
    `-i ${quote(videoPath)}`,
    '-vf',
    quote(vf),
    `-c:v ${VIDEO_CODEC}`,
    `-pix_fmt ${PIXEL_FORMAT}`,
    `-c:a copy`,
    quote(outputPath),
  ].join(' ');
}

export const __test__ = {
  LOGO_SIZE,
  LOGO_MARGIN,
  LOGO_ALPHA,
  BOTTOM_BAR_HEIGHT,
  BOTTOM_BAR_DURATION,
  INTRO_DURATION,
  OUTRO_DURATION,
  FONT_FILE,
  escapeDrawText,
  logoOverlayPosition,
};
