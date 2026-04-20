// S2 — Hash determinístico de user_id para eventos PostHog IE.
// Razón: user_id raw UUID en eventos correlacionable con otros datos PII.
// Usamos sha256(user_id + TELEMETRY_SALT) truncado a 12 hex chars para
// pseudonimizar sin perder capacidad de agregación (mismo user = mismo hash).
// TELEMETRY_SALT es string fija en env — NO rotar (rompe agregaciones).

import { createHash } from 'node:crypto';

const DEFAULT_SALT = 'ie-telemetry-fallback-2026-04'; // fallback si no hay env

function getSalt(): string {
  return process.env.TELEMETRY_SALT ?? DEFAULT_SALT;
}

// Retorna 12 chars hex (48 bits) — suficiente para ~281 trillion distinct
// values sin colisiones prácticas (nacimiento ≈ 16M users). Balance entre
// longitud y privacidad.
export function hashUserIdForTelemetry(userId: string): string {
  const salt = getSalt();
  return createHash('sha256').update(`${userId}:${salt}`).digest('hex').slice(0, 12);
}
