-- F14.F.10 Sprint 9 BIBLIA Upgrade 3 + LATERAL 6 — studio_photographer_invites.
-- Client invitation flow (Upgrade 3) + Referrer commission program (LATERAL 6).

create table public.studio_photographer_invites (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.studio_photographers(id) on delete cascade,
  invited_email text not null,
  invited_name text,
  invitation_type text not null
    check (invitation_type in ('client_invite','referral_program')),
  related_video_id uuid references public.studio_video_outputs(id) on delete set null,
  referral_token text not null unique,
  status text not null default 'sent'
    check (status in ('sent','opened','accepted','expired')),
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  subscribed_to_pro boolean not null default false,
  commission_earned_usd numeric(8,2),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_studio_photographer_invites_photographer on public.studio_photographer_invites(photographer_id);
create index idx_studio_photographer_invites_email on public.studio_photographer_invites(invited_email);
create unique index idx_studio_photographer_invites_token on public.studio_photographer_invites(referral_token);
create index idx_studio_photographer_invites_status on public.studio_photographer_invites(status);
create index idx_studio_photographer_invites_type on public.studio_photographer_invites(invitation_type);

alter table public.studio_photographer_invites enable row level security;

create policy studio_photographer_invites_select_owner on public.studio_photographer_invites
  for select to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_invites.photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_invites_insert_owner on public.studio_photographer_invites
  for insert to authenticated
  with check (
    exists (
      select 1 from public.studio_photographers p
      where p.id = photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_invites_update_owner on public.studio_photographer_invites
  for update to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_invites.photographer_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.studio_photographers p
      where p.id = photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_invites_delete_owner on public.studio_photographer_invites
  for delete to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_invites.photographer_id
        and p.user_id = auth.uid()
    )
  );

comment on table public.studio_photographer_invites is
  'F14.F.10 Sprint 9 BIBLIA Upgrade 3 + LATERAL 6 — Client invitations + Referral program 20% commission.';
