// F14.F.5 Sprint 4 — UPGRADE 1 DIRECTO: AI mood detection per día.
// Pure logic + persist studio_ai_coach_sessions row con mood detectado.
// Reglas:
//   closedDeals30d>=5 → celebratory (top performer)
//   closedDeals7d>=2 → high (semana fuerte)
//   closedDeals7d=0 AND leads7d<3 → low (motivacional)
//   else → neutral

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import {
  type Mood,
  type MoodDetectionInput,
  MoodDetectionInputSchema,
  type MoodDetectionResult,
} from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

const TONE_HINTS: Record<Mood, string> = {
  low: 'Tono motivacional y empático. Reconoce que esta semana fue lenta y proyecta confianza con frases que recuerden el valor del esfuerzo continuo.',
  neutral:
    'Tono profesional y consistente. Mantén el ritmo creativo sin altibajos emocionales en el copy.',
  high: 'Tono enérgico y propositivo. Refleja momentum positivo, usa verbos de acción y testimonia avances reales.',
  celebratory:
    'Tono celebratorio y aspiracional. Posiciona al asesor como referente, agradece la confianza de los clientes y proyecta autoridad de mercado.',
};

export function detectMood(metrics: MoodDetectionInput): MoodDetectionResult {
  const parsed = MoodDetectionInputSchema.parse(metrics);
  let mood: Mood;
  if (parsed.closedDeals30d >= 5) {
    mood = 'celebratory';
  } else if (parsed.closedDeals7d >= 2) {
    mood = 'high';
  } else if (parsed.closedDeals7d === 0 && parsed.leads7d < 3) {
    mood = 'low';
  } else {
    mood = 'neutral';
  }
  return { mood, toneHint: TONE_HINTS[mood] };
}

const SUGGESTED_ACTIONS: Record<Mood, string> = {
  low: 'Generar contenido de marca personal + remarketing leads tibios.',
  neutral: 'Mantener cadencia: 3 propiedades + 2 zona + 1 marca.',
  high: 'Doblar apuesta: subir 2 reels propiedad esta semana.',
  celebratory: 'Capitalizar momentum: testimonios + storytelling de cierre.',
};

export interface PersistMoodInput {
  readonly userId: string;
  readonly mood: Mood;
  readonly sessionDate: string; // YYYY-MM-DD
}

export async function persistMoodSession(
  input: PersistMoodInput,
  opts?: { client?: AdminClient },
): Promise<{ id: string } | null> {
  const supabase = opts?.client ?? createAdminClient();
  try {
    const { data, error } = await supabase
      .from('studio_ai_coach_sessions')
      .insert({
        user_id: input.userId,
        mood_detected: input.mood,
        session_date: input.sessionDate,
        suggested_action: SUGGESTED_ACTIONS[input.mood],
      })
      .select('id')
      .single();
    if (error || !data) {
      sentry.captureException(error ?? new Error('persistMoodSession: no row'), {
        tags: { feature: 'studio-calendar-mood' },
      });
      return null;
    }
    return { id: data.id };
  } catch (error) {
    sentry.captureException(error, { tags: { feature: 'studio-calendar-mood' } });
    return null;
  }
}
