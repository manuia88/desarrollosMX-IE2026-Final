// DMX Studio dentro DMX único entorno (ADR-054). Voice IDs canon ElevenLabs ES-LATAM pre-built.
// F14.F.4 voice clone activa cuando primer cliente Pro suscribe (ELEVENLABS_VOICE_CLONE_ENABLED=true).
// Voces pre-built default ElevenLabs library compatible con eleven_multilingual_v2 + eleven_flash_v2_5.

export interface CanonVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: 'es-LATAM';
  tone: string;
}

export const ELEVENLABS_CANON_VOICES_ES_MX: readonly CanonVoice[] = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    accent: 'es-LATAM',
    tone: 'warm-professional',
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    gender: 'female',
    accent: 'es-LATAM',
    tone: 'energetic-warm',
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'male',
    accent: 'es-LATAM',
    tone: 'narrative-deep',
  },
] as const;

export const DEFAULT_VOICE_ID_ES_MX: string =
  ELEVENLABS_CANON_VOICES_ES_MX[0]?.id ?? '21m00Tcm4TlvDq8ikWAM';

export function getCanonVoiceById(voiceId: string): CanonVoice | undefined {
  return ELEVENLABS_CANON_VOICES_ES_MX.find((v) => v.id === voiceId);
}
