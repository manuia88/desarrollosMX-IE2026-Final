// F14.F.7 Sprint 6 — Drone simulation prompt builder + cost estimator.
// Pure module: NO API calls. Returns prompt string + estimated cost.

import { z } from 'zod';

export const SimulateDroneInputSchema = z.object({
  imageUrl: z.string().url(),
  pattern: z.enum(['orbital', 'flyover', 'approach', 'reveal']),
  durationSeconds: z.number().int().min(3).max(15),
});

export type SimulateDroneInput = z.input<typeof SimulateDroneInputSchema>;

const PATTERN_PROMPT_FRAGMENT: Record<SimulateDroneInput['pattern'], string> = {
  orbital: 'cinematic orbital drone shot, slow 360 rotation around subject, smooth motion',
  flyover: 'cinematic flyover drone shot, top-down forward motion, aerial perspective',
  approach: 'cinematic approach drone shot, slow zoom-in towards entrance, dramatic',
  reveal: 'cinematic reveal drone shot, starts tight then pulls back to wide vista, dramatic',
};

const DRONE_COST_PER_SECOND_USD = 0.05;

export function buildKlingPromptForPattern(pattern: string, basePrompt?: string): string {
  const fragment =
    PATTERN_PROMPT_FRAGMENT[pattern as SimulateDroneInput['pattern']] ??
    PATTERN_PROMPT_FRAGMENT.orbital;
  const trimmedBase = basePrompt?.trim();
  if (trimmedBase && trimmedBase.length > 0) {
    return `${fragment}, ${trimmedBase}`;
  }
  return fragment;
}

export function estimateDroneCostUsd(durationSeconds: number): number {
  const safe = Math.max(0, Math.floor(durationSeconds));
  return Math.round(safe * DRONE_COST_PER_SECOND_USD * 100) / 100;
}
