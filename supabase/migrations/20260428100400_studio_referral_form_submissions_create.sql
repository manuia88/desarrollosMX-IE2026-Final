-- F14.F.8 Sprint 7 BIBLIA — studio_referral_form_submissions (Upgrade 10 CROSS-FUNCTION M03).
-- Form "Interesado" en galería pública → INSERT lead en M03 leads (cross-feature ADR-055).

create table public.studio_referral_form_submissions (
  id uuid primary key default gen_random_uuid(),
  asesor_user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'studio_gallery'
    check (source in ('studio_gallery','studio_video_share','studio_zone_heatmap')),
  source_video_id uuid references public.studio_video_outputs(id) on delete set null,
  submitted_name text not null,
  submitted_email text not null,
  submitted_phone text,
  submitted_message text,
  submitted_interest_type text
    check (submitted_interest_type in ('comprar','vender','rentar','asesoria','otro')),
  lead_created_id uuid references public.leads(id) on delete set null,
  ip_hash text,
  submitted_at timestamptz not null default now()
);

create index idx_studio_referral_asesor on public.studio_referral_form_submissions(asesor_user_id);
create index idx_studio_referral_submitted on public.studio_referral_form_submissions(submitted_at desc);
create index idx_studio_referral_lead on public.studio_referral_form_submissions(lead_created_id) where lead_created_id is not null;

alter table public.studio_referral_form_submissions enable row level security;

-- Insert público (form submission). cmd='a' ignorado por audit.
create policy studio_referral_insert_public on public.studio_referral_form_submissions
  for insert to anon, authenticated
  with check (true);

-- Select solo asesor dueño.
create policy studio_referral_select_owner on public.studio_referral_form_submissions
  for select to authenticated
  using (asesor_user_id = auth.uid());

-- Update solo asesor (link lead_created_id post-creación).
create policy studio_referral_update_owner on public.studio_referral_form_submissions
  for update to authenticated
  using (asesor_user_id = auth.uid())
  with check (asesor_user_id = auth.uid());

comment on table public.studio_referral_form_submissions is
  'F14.F.8 Sprint 7 BIBLIA Upgrade 10 — Form referral galería pública → lead M03 cross-feature ADR-055.';
