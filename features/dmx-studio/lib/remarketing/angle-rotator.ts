// F14.F.5 Sprint 4 Tarea 4.3 — Pure rotation canon. Sin BD, sin side-effects.
// Rotation order canonical: general -> cocina -> zona -> inversionista -> familiar -> lujo.
// Selecciona el angle siguiente al ultimo usado. Si no hay historia, retorna 'general'.
// Si todos los angles ya fueron usados, retorna el menos reciente (round-robin).

import { REMARKETING_ANGLES, type RemarketingAngle } from './types';

export function nextAngle(historyAngles: ReadonlyArray<string>): RemarketingAngle {
  if (historyAngles.length === 0) {
    return 'general';
  }
  // historyAngles ordered most-recent-first. Take the most recent valid angle.
  const lastValid = historyAngles.find((a): a is RemarketingAngle =>
    (REMARKETING_ANGLES as ReadonlyArray<string>).includes(a),
  );
  if (!lastValid) {
    return 'general';
  }
  const lastIndex = REMARKETING_ANGLES.indexOf(lastValid);
  const nextIndex = (lastIndex + 1) % REMARKETING_ANGLES.length;
  const candidate = REMARKETING_ANGLES[nextIndex];
  // Defensive: enum length is constant, candidate is always defined.
  return candidate ?? 'general';
}
