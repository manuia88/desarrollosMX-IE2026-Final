-- F14.F.3 Sprint 2 BIBLIA — Polish columns
--
-- Sprint 2 needs additional columns sin SECDEF nuevas (allowlist v34 stays):
--   * studio_brand_kits: secondary_color + font_preference + intro_text + outro_text + preview_storage_path
--   * studio_video_outputs: is_branded + has_beat_sync + has_branding_overlay
--   * studio_usage_logs: threshold_warning_sent (predictive 80% warning flag)
--
-- ADR-054 canon: tablas studio_* dentro DMX único entorno.
-- ADR-018: ALTER TABLE preservando RLS existing (already enabled F14.F.1).

-- ────────────────────────────────────────────────────────────────────
-- studio_brand_kits — Sprint 2 polish columns
-- ────────────────────────────────────────────────────────────────────
alter table public.studio_brand_kits
  add column if not exists secondary_color text,
  add column if not exists font_preference text default 'outfit'::text,
  add column if not exists intro_text text,
  add column if not exists outro_text text,
  add column if not exists preview_storage_path text;

comment on column public.studio_brand_kits.secondary_color is
  'Hex secondary color (#RRGGBB). Brand kit Sprint 2 polish.';
comment on column public.studio_brand_kits.font_preference is
  'Font key: outfit | dm_sans | inter | playfair. Default outfit canon ADR-050.';
comment on column public.studio_brand_kits.intro_text is
  'Intro text overlay first 3s of video. Optional.';
comment on column public.studio_brand_kits.outro_text is
  'Outro text overlay last 3s of video. Optional.';
comment on column public.studio_brand_kits.preview_storage_path is
  'Cached mockup preview path en bucket brand-assets. Refresh on form change.';

-- ────────────────────────────────────────────────────────────────────
-- studio_video_outputs — Sprint 2 polish columns
-- ────────────────────────────────────────────────────────────────────
alter table public.studio_video_outputs
  add column if not exists is_branded boolean not null default true,
  add column if not exists has_beat_sync boolean not null default false,
  add column if not exists has_branding_overlay boolean not null default false;

comment on column public.studio_video_outputs.is_branded is
  'true when branded version (default Pro+Agency). false when unbranded export (Foto plan reventa).';
comment on column public.studio_video_outputs.has_beat_sync is
  'true when transitions aligned to music beats (Sprint 2 upgrade DIRECTO).';
comment on column public.studio_video_outputs.has_branding_overlay is
  'true when FFmpeg branding overlay applied (logo + bottom bar). Sprint 2.';

-- ────────────────────────────────────────────────────────────────────
-- studio_usage_logs — predictive warning flag
-- ────────────────────────────────────────────────────────────────────
alter table public.studio_usage_logs
  add column if not exists threshold_warning_sent boolean not null default false;

comment on column public.studio_usage_logs.threshold_warning_sent is
  'true when 80% predictive warning email sent (Resend). Avoid duplicate sends.';

-- Index for threshold warning queries (per user current period)
create index if not exists studio_usage_logs_user_period_warning_idx
  on public.studio_usage_logs (user_id, period_month, threshold_warning_sent);
