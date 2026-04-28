-- F14.F.14 hotfix2 — studio-voice-previews bucket (public read).
-- mp3 samples Aurora/Mateo/Sofia ES-MX servidos en onboarding Step 2.
-- L-NEW-STUDIO-VOICE-PREVIEW-SAMPLES H2: generar via ElevenLabs API + upload aqui.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('studio-voice-previews', 'studio-voice-previews', true, 5242880,
    array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: SELECT publicly available via storage server (no explicit RLS policy needed).
-- INSERT/UPDATE/DELETE: solo service_role via createAdminClient() backend (RLS bypass).
