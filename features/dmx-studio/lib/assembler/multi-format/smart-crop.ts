// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — Smart crop heuristic.
// MVP H1: NO uses ffmpeg cropdetect (overhead alto). Center calculation puro
// sobre canon source 1080x1920 (9:16). Heurística suficiente para asset real
// estate típico (sujeto principal centrado por encuadre Kling).

import { buildReformatCommand } from './ffmpeg-multi-format-commands';

export interface FocalArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type SmartCropTargetAspect = '16x9' | '1x1' | '9x16';

const SOURCE_WIDTH_DEFAULT = 1080;
const SOURCE_HEIGHT_DEFAULT = 1920;

const TARGET_DIMENSIONS: Record<SmartCropTargetAspect, { width: number; height: number }> = {
  '9x16': { width: 1080, height: 1920 },
  '1x1': { width: 1080, height: 1080 },
  '16x9': { width: 1920, height: 1080 },
};

/**
 * Detect focal area for a source clip. MVP heuristic: assume canon 1080x1920
 * and return centered region anchored at vertical mid-third (sujeto típico
 * en cuarto superior central por encuadre estándar).
 */
export function detectFocalArea(_videoPath: string): FocalArea {
  const width = SOURCE_WIDTH_DEFAULT;
  const height = SOURCE_HEIGHT_DEFAULT;
  // Center crop by default. Use full canvas as detected focal area; downstream
  // crop command derives the actual crop window from target aspect.
  return {
    x: 0,
    y: 0,
    width,
    height,
  };
}

/**
 * Build a shell command that reformats the source video into the requested
 * target aspect, applying the focal area (currently center-anchored). For
 * `9x16` returns a no-op marker so caller can short-circuit (source IS 9:16).
 */
export function buildCropCommand(
  sourcePath: string,
  targetAspect: SmartCropTargetAspect,
  _focalArea: FocalArea,
  outputPath: string,
): string {
  if (targetAspect === '9x16') {
    // Source is already 9:16 → no reformat. Caller short-circuits and reuses
    // source path. Returned command is a defensive copy passthrough.
    return `cp ${JSON.stringify(sourcePath)} ${JSON.stringify(outputPath)}`;
  }
  const dims = TARGET_DIMENSIONS[targetAspect];
  return buildReformatCommand(sourcePath, dims.width, dims.height, outputPath);
}

export const __test__ = {
  TARGET_DIMENSIONS,
  SOURCE_WIDTH_DEFAULT,
  SOURCE_HEIGHT_DEFAULT,
};
