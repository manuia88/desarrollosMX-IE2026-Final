// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — Beat-sync utilities.
// MVP H1: heurística determinística basada en BPM declarado o fallback fijo
// (sin DSP audio analysis real — defer H2 cuando integration con beat-detection
// service viable). Suficiente para snap-transitions experiment.

const FALLBACK_INTERVAL_SECONDS = 0.5;
const MAX_BEATS = 32;

export interface AudioMetadata {
  readonly bpm?: number;
  readonly durationSeconds: number;
}

/**
 * Generate beat timestamps from audio metadata. If BPM declared, computes
 * 60/bpm interval and emits up to MAX_BEATS or duration cap (whichever lower).
 * Without BPM falls back to fixed interval (0.5s) which approximates 120 BPM.
 */
export function detectBeats(audioMetadata: AudioMetadata): ReadonlyArray<number> {
  const duration = Math.max(0, audioMetadata.durationSeconds);
  const interval =
    typeof audioMetadata.bpm === 'number' && audioMetadata.bpm > 0
      ? 60 / audioMetadata.bpm
      : FALLBACK_INTERVAL_SECONDS;

  const beats: number[] = [];
  let t = 0;
  while (beats.length < MAX_BEATS && t <= duration) {
    beats.push(Number(t.toFixed(3)));
    t += interval;
  }
  return beats;
}

/**
 * For each clip-end timestamp, snap it to the nearest beat. Returns original
 * sequence unchanged when beats array is empty (defensive no-op).
 */
export function alignTransitionsToBeats(
  clipEndTimestamps: ReadonlyArray<number>,
  beats: ReadonlyArray<number>,
): ReadonlyArray<number> {
  if (beats.length === 0) return clipEndTimestamps;
  return clipEndTimestamps.map((endTs) => {
    let nearest = beats[0] ?? endTs;
    let nearestDelta = Math.abs(endTs - nearest);
    for (let i = 1; i < beats.length; i += 1) {
      const candidate = beats[i] as number;
      const delta = Math.abs(endTs - candidate);
      if (delta < nearestDelta) {
        nearest = candidate;
        nearestDelta = delta;
      }
    }
    return Number(nearest.toFixed(3));
  });
}

/**
 * Build a fade-transitions FFmpeg filter expression aligned to the supplied
 * beats. MVP returns a non-destructive `null` filter chain when beats vacío;
 * else emits a chained `fade=t=in` per beat with conservative 0.05s duration.
 * Output is a `-vf` value (no leading flag) consumable by ffmpeg directly.
 */
export function buildBeatSyncFilter(beats: ReadonlyArray<number>): string {
  if (beats.length === 0) return 'null';
  const fadeDuration = 0.05;
  const fades = beats
    .slice(0, MAX_BEATS)
    .map((beat) => `fade=t=in:st=${beat.toFixed(3)}:d=${fadeDuration.toFixed(3)}:alpha=1`)
    .join(',');
  return fades.length > 0 ? fades : 'null';
}

export const __test__ = {
  FALLBACK_INTERVAL_SECONDS,
  MAX_BEATS,
};
