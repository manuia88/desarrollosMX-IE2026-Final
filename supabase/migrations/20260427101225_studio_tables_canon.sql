-- F14.F.1 Sprint 0: 21 tablas Studio canon (BIBLIA v4 PARTE III).
-- DMX Studio dentro DMX único entorno (ADR-054). Prefijo studio_*.
-- RLS ON todas + policies canon select/insert/update/delete por user_id.

-- ============================================================
-- 1. studio_organizations (multi-tenancy agencias)
-- ============================================================
create table public.studio_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique,
  plan_key text not null default 'pro',
  seats_total integer not null default 1,
  seats_used integer not null default 1,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_organizations_owner on public.studio_organizations(owner_user_id);
create index idx_studio_organizations_slug on public.studio_organizations(slug) where slug is not null;
alter table public.studio_organizations enable row level security;
create policy studio_organizations_select_owner on public.studio_organizations for select to authenticated using (owner_user_id = auth.uid());
create policy studio_organizations_insert_owner on public.studio_organizations for insert to authenticated with check (owner_user_id = auth.uid());
create policy studio_organizations_update_owner on public.studio_organizations for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy studio_organizations_delete_owner on public.studio_organizations for delete to authenticated using (owner_user_id = auth.uid());

-- ============================================================
-- 2. studio_users_extension (1:1 con profiles)
-- ============================================================
create table public.studio_users_extension (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  studio_role text not null default 'studio_user' check (studio_role in ('studio_user','studio_admin','studio_photographer')),
  organization_id uuid references public.studio_organizations(id) on delete set null,
  onboarding_completed boolean not null default false,
  onboarding_step text,
  brand_kit_completed boolean not null default false,
  voice_clone_completed boolean not null default false,
  first_video_generated_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_users_extension_org on public.studio_users_extension(organization_id) where organization_id is not null;
alter table public.studio_users_extension enable row level security;
create policy studio_users_extension_select_self on public.studio_users_extension for select to authenticated using (user_id = auth.uid());
create policy studio_users_extension_insert_self on public.studio_users_extension for insert to authenticated with check (user_id = auth.uid());
create policy studio_users_extension_update_self on public.studio_users_extension for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 3. studio_subscriptions (planes Stripe)
-- ============================================================
create table public.studio_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  plan_key text not null check (plan_key in ('pro','foto','agency')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text not null,
  status text not null default 'incomplete' check (status in ('incomplete','active','past_due','canceled','trialing','unpaid','paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  videos_per_month_limit integer not null default 5,
  videos_used_this_period integer not null default 0,
  founders_cohort boolean not null default false,
  founders_discount_pct integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_subscriptions_user_status on public.studio_subscriptions(user_id, status);
create index idx_studio_subscriptions_stripe_sub on public.studio_subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;
create index idx_studio_subscriptions_stripe_customer on public.studio_subscriptions(stripe_customer_id) where stripe_customer_id is not null;
alter table public.studio_subscriptions enable row level security;
create policy studio_subscriptions_select_self on public.studio_subscriptions for select to authenticated using (user_id = auth.uid());
create policy studio_subscriptions_insert_self on public.studio_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy studio_subscriptions_update_self on public.studio_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 4. studio_brand_kits
-- ============================================================
create table public.studio_brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  display_name text,
  tagline text,
  primary_color text,
  accent_color text,
  logo_url text,
  watermark_url text,
  tone text not null default 'professional' check (tone in ('professional','luxury','friendly','energetic','minimal','editorial')),
  zones text[] not null default '{}',
  cities text[] not null default '{}',
  contact_phone text,
  contact_email text,
  social_links jsonb not null default '{}'::jsonb,
  is_default boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_brand_kits_user on public.studio_brand_kits(user_id);
create index idx_studio_brand_kits_org on public.studio_brand_kits(organization_id) where organization_id is not null;
alter table public.studio_brand_kits enable row level security;
create policy studio_brand_kits_select_self on public.studio_brand_kits for select to authenticated using (user_id = auth.uid());
create policy studio_brand_kits_insert_self on public.studio_brand_kits for insert to authenticated with check (user_id = auth.uid());
create policy studio_brand_kits_update_self on public.studio_brand_kits for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_brand_kits_delete_self on public.studio_brand_kits for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 5. studio_voice_clones
-- ============================================================
create table public.studio_voice_clones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  name text not null,
  elevenlabs_voice_id text,
  clone_type text not null default 'instant' check (clone_type in ('instant','professional','generic')),
  status text not null default 'pending' check (status in ('pending','training','ready','failed','revoked')),
  source_audio_url text,
  preview_url text,
  language text not null default 'es-MX',
  consent_signed boolean not null default false,
  consent_signed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_voice_clones_user on public.studio_voice_clones(user_id);
create index idx_studio_voice_clones_status on public.studio_voice_clones(status);
alter table public.studio_voice_clones enable row level security;
create policy studio_voice_clones_select_self on public.studio_voice_clones for select to authenticated using (user_id = auth.uid());
create policy studio_voice_clones_insert_self on public.studio_voice_clones for insert to authenticated with check (user_id = auth.uid());
create policy studio_voice_clones_update_self on public.studio_voice_clones for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_voice_clones_delete_self on public.studio_voice_clones for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 6. studio_style_templates (catalog publico)
-- ============================================================
create table public.studio_style_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  tone text not null check (tone in ('professional','luxury','friendly','energetic','minimal','editorial')),
  visual_treatment jsonb not null default '{}'::jsonb,
  music_mood text,
  pacing text not null default 'medium' check (pacing in ('slow','medium','fast')),
  is_premium boolean not null default false,
  is_active boolean not null default true,
  preview_url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_style_templates_active on public.studio_style_templates(is_active) where is_active;
alter table public.studio_style_templates enable row level security;
create policy studio_style_templates_select_all on public.studio_style_templates for select to authenticated, anon using (is_active);

-- ============================================================
-- 7. studio_music_tracks
-- ============================================================
create table public.studio_music_tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default 'elevenlabs' check (provider in ('elevenlabs','library','user_upload')),
  external_id text,
  preview_url text,
  full_url text,
  duration_seconds integer,
  bpm integer,
  mood text,
  genre text,
  is_premium boolean not null default false,
  is_active boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_music_tracks_active on public.studio_music_tracks(is_active) where is_active;
alter table public.studio_music_tracks enable row level security;
create policy studio_music_tracks_select_all on public.studio_music_tracks for select to authenticated using (is_active);

-- ============================================================
-- 8. studio_video_projects (proyectos canonicos)
-- ============================================================
create table public.studio_video_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  brand_kit_id uuid references public.studio_brand_kits(id) on delete set null,
  voice_clone_id uuid references public.studio_voice_clones(id) on delete set null,
  style_template_id uuid references public.studio_style_templates(id) on delete set null,
  music_track_id uuid references public.studio_music_tracks(id) on delete set null,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  unidad_id uuid references public.unidades(id) on delete set null,
  captacion_id uuid references public.captaciones(id) on delete set null,
  title text not null,
  project_type text not null default 'standard' check (project_type in ('standard','series','reel','story','portrait','documentary','remarketing')),
  status text not null default 'draft' check (status in ('draft','scripting','rendering','rendered','published','archived','failed')),
  hook_variants_count integer not null default 3,
  format_variants jsonb not null default '["9x16","1x1","16x9"]'::jsonb,
  enable_virtual_staging boolean not null default false,
  enable_drone_sim boolean not null default false,
  enable_ambient_audio boolean not null default true,
  enable_avatar boolean not null default false,
  enable_remarketing boolean not null default false,
  source_metadata jsonb not null default '{}'::jsonb,
  director_brief jsonb not null default '{}'::jsonb,
  rendered_at timestamptz,
  published_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_video_projects_user on public.studio_video_projects(user_id);
create index idx_studio_video_projects_user_status on public.studio_video_projects(user_id, status);
create index idx_studio_video_projects_type on public.studio_video_projects(project_type);
create index idx_studio_video_projects_proyecto on public.studio_video_projects(proyecto_id) where proyecto_id is not null;
alter table public.studio_video_projects enable row level security;
create policy studio_video_projects_select_self on public.studio_video_projects for select to authenticated using (user_id = auth.uid());
create policy studio_video_projects_insert_self on public.studio_video_projects for insert to authenticated with check (user_id = auth.uid());
create policy studio_video_projects_update_self on public.studio_video_projects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_video_projects_delete_self on public.studio_video_projects for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 9. studio_video_assets (fotos + videos uploads)
-- ============================================================
create table public.studio_video_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_type text not null check (asset_type in ('photo','video','voiceover','script','overlay')),
  storage_url text not null,
  thumbnail_url text,
  width integer,
  height integer,
  duration_seconds numeric,
  size_bytes bigint,
  mime_type text,
  order_index integer not null default 0,
  ai_classification jsonb not null default '{}'::jsonb,
  ai_quality_score numeric,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_video_assets_project on public.studio_video_assets(project_id);
create index idx_studio_video_assets_user on public.studio_video_assets(user_id);
alter table public.studio_video_assets enable row level security;
create policy studio_video_assets_select_self on public.studio_video_assets for select to authenticated using (user_id = auth.uid());
create policy studio_video_assets_insert_self on public.studio_video_assets for insert to authenticated with check (user_id = auth.uid());
create policy studio_video_assets_update_self on public.studio_video_assets for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_video_assets_delete_self on public.studio_video_assets for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 10. studio_video_outputs (9 archivos: 3 hooks x 3 formatos)
-- ============================================================
create table public.studio_video_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hook_variant text not null check (hook_variant in ('hook_a','hook_b','hook_c')),
  format text not null check (format in ('9x16','1x1','16x9','4x5')),
  storage_url text not null,
  thumbnail_url text,
  duration_seconds numeric,
  size_bytes bigint,
  render_status text not null default 'pending' check (render_status in ('pending','rendering','completed','failed')),
  render_provider text,
  render_cost_usd numeric default 0,
  selected_by_user boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_video_outputs_project on public.studio_video_outputs(project_id);
create index idx_studio_video_outputs_user on public.studio_video_outputs(user_id);
create unique index uq_studio_video_outputs_project_hook_format on public.studio_video_outputs(project_id, hook_variant, format);
alter table public.studio_video_outputs enable row level security;
create policy studio_video_outputs_select_self on public.studio_video_outputs for select to authenticated using (user_id = auth.uid());
create policy studio_video_outputs_insert_self on public.studio_video_outputs for insert to authenticated with check (user_id = auth.uid());
create policy studio_video_outputs_update_self on public.studio_video_outputs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 11. studio_copy_outputs (captions + hashtags + WA + portal + narration)
-- ============================================================
create table public.studio_copy_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('instagram_caption','tiktok_caption','wa_message','email_subject','email_body','portal_listing','narration_script','hashtags','blog_post')),
  language text not null default 'es-MX',
  content text not null,
  variants jsonb not null default '[]'::jsonb,
  selected_by_user boolean not null default false,
  ai_model text,
  ai_cost_usd numeric default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_copy_outputs_project on public.studio_copy_outputs(project_id);
create index idx_studio_copy_outputs_user on public.studio_copy_outputs(user_id);
create index idx_studio_copy_outputs_channel on public.studio_copy_outputs(channel);
alter table public.studio_copy_outputs enable row level security;
create policy studio_copy_outputs_select_self on public.studio_copy_outputs for select to authenticated using (user_id = auth.uid());
create policy studio_copy_outputs_insert_self on public.studio_copy_outputs for insert to authenticated with check (user_id = auth.uid());
create policy studio_copy_outputs_update_self on public.studio_copy_outputs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 12. studio_content_calendar (calendario IA mensual)
-- ============================================================
create table public.studio_content_calendar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  scheduled_for date not null,
  scheduled_time time,
  channel text not null check (channel in ('instagram','tiktok','facebook','wa_status','linkedin','email','blog')),
  content_type text not null check (content_type in ('video','reel','story','post','email_blast','blog_post')),
  project_id uuid references public.studio_video_projects(id) on delete set null,
  status text not null default 'planned' check (status in ('planned','scheduled','published','skipped','failed')),
  ai_generated boolean not null default true,
  topic text,
  notes text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_content_calendar_user_date on public.studio_content_calendar(user_id, scheduled_for);
create index idx_studio_content_calendar_status on public.studio_content_calendar(status);
alter table public.studio_content_calendar enable row level security;
create policy studio_content_calendar_select_self on public.studio_content_calendar for select to authenticated using (user_id = auth.uid());
create policy studio_content_calendar_insert_self on public.studio_content_calendar for insert to authenticated with check (user_id = auth.uid());
create policy studio_content_calendar_update_self on public.studio_content_calendar for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_content_calendar_delete_self on public.studio_content_calendar for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 13. studio_api_jobs (cola IA con cost tracking)
-- ============================================================
create table public.studio_api_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_type text not null check (job_type in ('claude_director','kling_render','seedance_render','elevenlabs_voice','flux_image','vision_classify','heygen_avatar','virtual_staging','sandbox_ffmpeg','deepgram_transcribe')),
  provider text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled','retrying')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  external_job_id text,
  estimated_cost_usd numeric default 0,
  actual_cost_usd numeric default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_api_jobs_project on public.studio_api_jobs(project_id) where project_id is not null;
create index idx_studio_api_jobs_user on public.studio_api_jobs(user_id);
create index idx_studio_api_jobs_status_created on public.studio_api_jobs(status, created_at);
create index idx_studio_api_jobs_external on public.studio_api_jobs(external_job_id) where external_job_id is not null;
alter table public.studio_api_jobs enable row level security;
create policy studio_api_jobs_select_self on public.studio_api_jobs for select to authenticated using (user_id = auth.uid());
create policy studio_api_jobs_insert_self on public.studio_api_jobs for insert to authenticated with check (user_id = auth.uid());
create policy studio_api_jobs_update_self on public.studio_api_jobs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 14. studio_usage_logs (consumo + costos)
-- ============================================================
create table public.studio_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  subscription_id uuid references public.studio_subscriptions(id) on delete set null,
  project_id uuid references public.studio_video_projects(id) on delete set null,
  api_job_id uuid references public.studio_api_jobs(id) on delete set null,
  metric_type text not null check (metric_type in ('video_render','copy_generation','voice_synthesis','voice_clone_train','image_generation','vision_classify','virtual_staging','avatar_render','transcription','sandbox_render')),
  metric_amount numeric not null default 1,
  cost_usd numeric not null default 0,
  period_month text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_studio_usage_logs_user_period on public.studio_usage_logs(user_id, period_month);
create index idx_studio_usage_logs_subscription on public.studio_usage_logs(subscription_id) where subscription_id is not null;
create index idx_studio_usage_logs_project on public.studio_usage_logs(project_id) where project_id is not null;
alter table public.studio_usage_logs enable row level security;
create policy studio_usage_logs_select_self on public.studio_usage_logs for select to authenticated using (user_id = auth.uid());
create policy studio_usage_logs_insert_self on public.studio_usage_logs for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- 15. studio_feedback (rating + hook seleccionado + format preferido)
-- ============================================================
create table public.studio_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_output_id uuid references public.studio_video_outputs(id) on delete set null,
  rating integer check (rating >= 1 and rating <= 5),
  selected_hook text,
  preferred_format text,
  comments text,
  would_recommend boolean,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_studio_feedback_project on public.studio_feedback(project_id);
create index idx_studio_feedback_user on public.studio_feedback(user_id);
alter table public.studio_feedback enable row level security;
create policy studio_feedback_select_self on public.studio_feedback for select to authenticated using (user_id = auth.uid());
create policy studio_feedback_insert_self on public.studio_feedback for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- 16. studio_portal_imports (URLs portales MX scraping H2 STUB)
-- ============================================================
create table public.studio_portal_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.studio_video_projects(id) on delete cascade,
  source_portal text not null check (source_portal in ('inmuebles24','lamudi','easybroker','vivanuncios','propiedades_com','manual_url','unknown')),
  source_url text not null,
  scrape_status text not null default 'pending' check (scrape_status in ('pending','scraping','completed','failed','blocked','manual_required')),
  scraped_data jsonb not null default '{}'::jsonb,
  error_message text,
  is_stub boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_portal_imports_user on public.studio_portal_imports(user_id);
create index idx_studio_portal_imports_project on public.studio_portal_imports(project_id) where project_id is not null;
alter table public.studio_portal_imports enable row level security;
create policy studio_portal_imports_select_self on public.studio_portal_imports for select to authenticated using (user_id = auth.uid());
create policy studio_portal_imports_insert_self on public.studio_portal_imports for insert to authenticated with check (user_id = auth.uid());
create policy studio_portal_imports_update_self on public.studio_portal_imports for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 17. studio_virtual_staging_jobs (H2)
-- ============================================================
create table public.studio_virtual_staging_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  source_asset_id uuid references public.studio_video_assets(id) on delete set null,
  staging_style text not null default 'modern' check (staging_style in ('modern','classic','minimalist','industrial','bohemian','luxury','family')),
  room_type text check (room_type in ('living','bedroom','kitchen','bathroom','dining','office','outdoor','garage','other')),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  output_url text,
  cost_usd numeric default 0,
  is_stub boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_virtual_staging_user on public.studio_virtual_staging_jobs(user_id);
create index idx_studio_virtual_staging_project on public.studio_virtual_staging_jobs(project_id);
alter table public.studio_virtual_staging_jobs enable row level security;
create policy studio_virtual_staging_jobs_select_self on public.studio_virtual_staging_jobs for select to authenticated using (user_id = auth.uid());
create policy studio_virtual_staging_jobs_insert_self on public.studio_virtual_staging_jobs for insert to authenticated with check (user_id = auth.uid());
create policy studio_virtual_staging_jobs_update_self on public.studio_virtual_staging_jobs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 18. studio_drone_simulations (H2)
-- ============================================================
create table public.studio_drone_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.studio_video_projects(id) on delete cascade,
  simulation_type text not null default 'orbital' check (simulation_type in ('orbital','flyover','approach','reveal','crane','tracking')),
  source_lat numeric,
  source_lng numeric,
  altitude_m integer,
  duration_seconds integer,
  status text not null default 'pending' check (status in ('pending','rendering','completed','failed')),
  output_url text,
  cost_usd numeric default 0,
  is_stub boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_drone_user on public.studio_drone_simulations(user_id);
create index idx_studio_drone_project on public.studio_drone_simulations(project_id);
alter table public.studio_drone_simulations enable row level security;
create policy studio_drone_simulations_select_self on public.studio_drone_simulations for select to authenticated using (user_id = auth.uid());
create policy studio_drone_simulations_insert_self on public.studio_drone_simulations for insert to authenticated with check (user_id = auth.uid());
create policy studio_drone_simulations_update_self on public.studio_drone_simulations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 19. studio_series_projects (H2 modo serie/documental)
-- ============================================================
create table public.studio_series_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  title text not null,
  series_type text not null default 'documentary' check (series_type in ('documentary','tour','market_recap','case_study','behind_the_scenes')),
  episodes_count integer not null default 0,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','in_production','published','archived')),
  episode_project_ids uuid[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_series_user on public.studio_series_projects(user_id);
alter table public.studio_series_projects enable row level security;
create policy studio_series_projects_select_self on public.studio_series_projects for select to authenticated using (user_id = auth.uid());
create policy studio_series_projects_insert_self on public.studio_series_projects for insert to authenticated with check (user_id = auth.uid());
create policy studio_series_projects_update_self on public.studio_series_projects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_series_projects_delete_self on public.studio_series_projects for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 20. studio_public_galleries (galeria publica /studio/[slug])
-- ============================================================
create table public.studio_public_galleries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.studio_organizations(id) on delete set null,
  slug text unique not null,
  title text not null,
  bio text,
  is_active boolean not null default true,
  cover_image_url text,
  featured_video_ids uuid[] not null default '{}',
  view_count integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_studio_public_galleries_user on public.studio_public_galleries(user_id);
create index idx_studio_public_galleries_slug on public.studio_public_galleries(slug);
alter table public.studio_public_galleries enable row level security;
create policy studio_public_galleries_select_public on public.studio_public_galleries for select to authenticated, anon using (is_active);
create policy studio_public_galleries_insert_self on public.studio_public_galleries for insert to authenticated with check (user_id = auth.uid());
create policy studio_public_galleries_update_self on public.studio_public_galleries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_public_galleries_delete_self on public.studio_public_galleries for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 21. studio_waitlist (lista espera con priority + founders cohort)
-- ============================================================
create table public.studio_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,
  role text not null default 'asesor' check (role in ('asesor','admin_desarrolladora','broker','photographer','investor','other')),
  city text,
  country_code char(2) default 'MX',
  current_user_id uuid references public.profiles(id) on delete set null,
  current_leads_count integer default 0,
  current_closed_deals_count integer default 0,
  priority_score integer not null default 0,
  founders_cohort_eligible boolean not null default false,
  founders_cohort_position integer,
  source text default 'landing',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  notified_at timestamptz,
  converted_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_studio_waitlist_email on public.studio_waitlist(lower(email));
create index idx_studio_waitlist_priority on public.studio_waitlist(priority_score desc, created_at);
create index idx_studio_waitlist_founders on public.studio_waitlist(founders_cohort_eligible, founders_cohort_position) where founders_cohort_eligible;
alter table public.studio_waitlist enable row level security;
create policy studio_waitlist_select_self on public.studio_waitlist for select to authenticated using (current_user_id = auth.uid());
create policy studio_waitlist_insert_anon on public.studio_waitlist for insert to authenticated, anon with check (true);

-- ============================================================
-- Updated_at triggers (canon DMX set_updated_at)
-- ============================================================
create trigger trg_studio_organizations_updated_at before update on public.studio_organizations for each row execute function public.set_updated_at();
create trigger trg_studio_users_extension_updated_at before update on public.studio_users_extension for each row execute function public.set_updated_at();
create trigger trg_studio_subscriptions_updated_at before update on public.studio_subscriptions for each row execute function public.set_updated_at();
create trigger trg_studio_brand_kits_updated_at before update on public.studio_brand_kits for each row execute function public.set_updated_at();
create trigger trg_studio_voice_clones_updated_at before update on public.studio_voice_clones for each row execute function public.set_updated_at();
create trigger trg_studio_style_templates_updated_at before update on public.studio_style_templates for each row execute function public.set_updated_at();
create trigger trg_studio_music_tracks_updated_at before update on public.studio_music_tracks for each row execute function public.set_updated_at();
create trigger trg_studio_video_projects_updated_at before update on public.studio_video_projects for each row execute function public.set_updated_at();
create trigger trg_studio_video_assets_updated_at before update on public.studio_video_assets for each row execute function public.set_updated_at();
create trigger trg_studio_video_outputs_updated_at before update on public.studio_video_outputs for each row execute function public.set_updated_at();
create trigger trg_studio_copy_outputs_updated_at before update on public.studio_copy_outputs for each row execute function public.set_updated_at();
create trigger trg_studio_content_calendar_updated_at before update on public.studio_content_calendar for each row execute function public.set_updated_at();
create trigger trg_studio_api_jobs_updated_at before update on public.studio_api_jobs for each row execute function public.set_updated_at();
create trigger trg_studio_portal_imports_updated_at before update on public.studio_portal_imports for each row execute function public.set_updated_at();
create trigger trg_studio_virtual_staging_jobs_updated_at before update on public.studio_virtual_staging_jobs for each row execute function public.set_updated_at();
create trigger trg_studio_drone_simulations_updated_at before update on public.studio_drone_simulations for each row execute function public.set_updated_at();
create trigger trg_studio_series_projects_updated_at before update on public.studio_series_projects for each row execute function public.set_updated_at();
create trigger trg_studio_public_galleries_updated_at before update on public.studio_public_galleries for each row execute function public.set_updated_at();
create trigger trg_studio_waitlist_updated_at before update on public.studio_waitlist for each row execute function public.set_updated_at();

-- ============================================================
-- Comments documentando contexto Studio dentro DMX (ADR-054)
-- ============================================================
comment on table public.studio_organizations is 'F14.F.1 Studio: multi-tenant agencias. Studio dentro DMX único entorno (ADR-054).';
comment on table public.studio_users_extension is 'F14.F.1 Studio: 1:1 con profiles. Tracking onboarding. Studio dentro DMX único entorno.';
comment on table public.studio_subscriptions is 'F14.F.1 Studio: planes Stripe (pro/foto/agency). Stripe shared con DMX core.';
comment on table public.studio_brand_kits is 'F14.F.1 Studio: identidad visual asesor. Auto-import desde profiles+contactos DMX.';
comment on table public.studio_voice_clones is 'F14.F.1 Studio: ElevenLabs voice clones. Activable Sprint 4 con primer cliente.';
comment on table public.studio_video_projects is 'F14.F.1 Studio: canon proyectos video con flags virtual_staging+drone+ambient_audio+avatar+remarketing.';
comment on table public.studio_video_outputs is 'F14.F.1 Studio: 9 archivos rendered (3 hooks x 3 formatos canon).';
comment on table public.studio_copy_outputs is 'F14.F.1 Studio: copy multichannel (caption+hashtags+wa+email+narration).';
comment on table public.studio_api_jobs is 'F14.F.1 Studio: cola IA con cost tracking per provider.';
comment on table public.studio_waitlist is 'F14.F.1 Studio: lista espera con priority scoring + founders cohort first 50.';
comment on table public.studio_public_galleries is 'F14.F.1 Studio: galeria publica /studio/[slug] showcase asesor.';
