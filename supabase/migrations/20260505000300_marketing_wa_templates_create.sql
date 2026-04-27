-- F14.C M08 Marketing — wa_templates (WhatsApp templates asesor, H1 Web QR style)
-- H1 status canon: solo 'draft' (Web QR style — no Meta Business approval real H1).
-- H2 stub: status pending/approved/rejected + meta_template_id requeridos cuando se active Meta API.
-- Cero SECDEF nuevas.

create table if not exists public.wa_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  category text not null check (category in ('marketing', 'utility')),
  body text not null check (char_length(body) between 1 and 1024),
  placeholders jsonb not null default '[]'::jsonb,
  header_type text not null default 'none' check (header_type in ('none', 'text', 'image', 'video')),
  header_content text,
  footer text check (char_length(footer) <= 60),
  buttons jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  meta_template_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wa_templates is
  'F14.C M08 — WA templates asesor (H1 Web QR style draft only; H2 stub Meta Business approval flow).';
comment on column public.wa_templates.placeholders is
  'Array {key, label, example} validado Zod app-layer.';
comment on column public.wa_templates.buttons is
  'Array {type: cta_url|quick_reply, label, url?} validado Zod.';
comment on column public.wa_templates.status is
  'H1 canon: draft only (Web QR). H2: pending/approved/rejected vía Meta Business API.';
comment on column public.wa_templates.meta_template_id is
  'STUB ADR-018 H2: ID Meta Business API. NULL en H1. Activar cuando shippe Meta integration F22+.';

create index if not exists idx_wa_templates_user
  on public.wa_templates(user_id);
create index if not exists idx_wa_templates_user_status
  on public.wa_templates(user_id, status);

drop trigger if exists trg_wa_templates_updated_at on public.wa_templates;
create trigger trg_wa_templates_updated_at
  before update on public.wa_templates
  for each row execute function public.set_updated_at();

alter table public.wa_templates enable row level security;

drop policy if exists wa_templates_select_owner on public.wa_templates;
create policy wa_templates_select_owner on public.wa_templates
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists wa_templates_select_admin on public.wa_templates;
create policy wa_templates_select_admin on public.wa_templates
  for select to authenticated
  using (public.rls_is_admin());

drop policy if exists wa_templates_insert_owner on public.wa_templates;
create policy wa_templates_insert_owner on public.wa_templates
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists wa_templates_update_owner on public.wa_templates;
create policy wa_templates_update_owner on public.wa_templates
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists wa_templates_delete_owner on public.wa_templates;
create policy wa_templates_delete_owner on public.wa_templates
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.wa_templates to authenticated;
