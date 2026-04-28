// DMX Studio dentro DMX único entorno (ADR-054). Voice IDs canon ElevenLabs ES-LATAM pre-built.
// F14.F.4 voice clone activa cuando primer cliente Pro suscribe (ELEVENLABS_VOICE_CLONE_ENABLED=true).
// F14.F.14 hotfix2 — naming canon Aurora/Mateo/Sofia ES-MX (founder UX decision 2026-04-28).
// Voces pre-built default ElevenLabs library compatible con eleven_multilingual_v2 + eleven_flash_v2_5.
// samplePreviewUrl apunta a Supabase Storage bucket studio-voice-previews (public read).
// STUB ADR-018: mp3 samples no existen aun — VoiceQualityPreview muestra "Proximamente"
// si audio.error/play fail. L-NEW-STUDIO-VOICE-PREVIEW-SAMPLES H2: generar via ElevenLabs API
// + upload via service_role.

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://qxfuqwlktmhokwwlvggy.supabase.co';
const VOICE_PREVIEW_BUCKET_BASE = `${SUPABASE_URL}/storage/v1/object/public/studio-voice-previews`;

export interface CanonVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: 'es-LATAM';
  tone: string;
  samplePreviewUrl: string;
}

export const ELEVENLABS_CANON_VOICES_ES_MX: readonly CanonVoice[] = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Aurora MX',
    gender: 'female',
    accent: 'es-LATAM',
    tone: 'warm-professional',
    samplePreviewUrl: `${VOICE_PREVIEW_BUCKET_BASE}/aurora-mx.mp3`,
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Mateo MX',
    gender: 'male',
    accent: 'es-LATAM',
    tone: 'narrative-deep',
    samplePreviewUrl: `${VOICE_PREVIEW_BUCKET_BASE}/mateo-mx.mp3`,
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Sofía MX',
    gender: 'female',
    accent: 'es-LATAM',
    tone: 'energetic-warm',
    samplePreviewUrl: `${VOICE_PREVIEW_BUCKET_BASE}/sofia-mx.mp3`,
  },
] as const;

export const DEFAULT_VOICE_ID_ES_MX: string =
  ELEVENLABS_CANON_VOICES_ES_MX[0]?.id ?? '21m00Tcm4TlvDq8ikWAM';

export function getCanonVoiceById(voiceId: string): CanonVoice | undefined {
  return ELEVENLABS_CANON_VOICES_ES_MX.find((v) => v.id === voiceId);
}

export function isCanonPrebuiltVoiceId(voiceId: string | null | undefined): boolean {
  if (!voiceId) return false;
  return ELEVENLABS_CANON_VOICES_ES_MX.some((v) => v.id === voiceId);
}
