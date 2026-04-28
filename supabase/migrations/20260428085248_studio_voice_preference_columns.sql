-- F14.F.14 hotfix2 — voice_preference enum + selected_prebuilt_voice_id on studio_users_extension.
-- Onboarding canon: clone (premium IVC, gated ELEVENLABS_VOICE_CLONE_ENABLED),
-- prebuilt (default Aurora/Mateo/Sofia ES-MX), none (music-only, skip TTS).

alter table public.studio_users_extension
  add column if not exists voice_preference text not null default 'prebuilt'
    check (voice_preference in ('clone', 'prebuilt', 'none')),
  add column if not exists selected_prebuilt_voice_id text;

comment on column public.studio_users_extension.voice_preference is
  'F14.F.14 hotfix2 — onboarding canon: clone (premium IVC), prebuilt (default), none (music-only).';
comment on column public.studio_users_extension.selected_prebuilt_voice_id is
  'F14.F.14 hotfix2 — ElevenLabs voice_id when voice_preference=prebuilt (ELEVENLABS_CANON_VOICES_ES_MX).';
