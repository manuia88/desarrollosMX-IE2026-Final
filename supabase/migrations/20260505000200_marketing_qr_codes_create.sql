-- F14.C M08 Marketing — qr_codes (asesor QR generator + UTM tracking)
-- Destino: proyecto / landing / microsite. PNG + SVG storage paths.
-- Cero SECDEF nuevas.

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destino_type text not null check (destino_type in ('proyecto', 'landing', 'microsite')),
  destino_id text not null,
  copy text check (char_length(copy) <= 200),
  color_hex text check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  utm_source text not null default 'qr',
  utm_medium text not null default 'scan',
  utm_campaign text,
  short_url text not null unique,
  png_storage_path text,
  svg_storage_path text,
  scan_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.qr_codes is
  'F14.C M08 — QR codes asesor con destino polimórfico (proyecto/landing/microsite) + UTM tracking + short_url único.';
comment on column public.qr_codes.destino_id is
  'FK polimórfico: uuid proyecto/landing o slug microsite. Validación app-layer Zod.';
comment on column public.qr_codes.short_url is
  'URL corta UNIQUE global (e.g. dmx.mx/q/abc123). Resolver via cron/route.';

create index if not exists idx_qr_codes_user
  on public.qr_codes(user_id);
create index if not exists idx_qr_codes_short_url
  on public.qr_codes(short_url);

drop trigger if exists trg_qr_codes_updated_at on public.qr_codes;
create trigger trg_qr_codes_updated_at
  before update on public.qr_codes
  for each row execute function public.set_updated_at();

alter table public.qr_codes enable row level security;

drop policy if exists qr_codes_select_owner on public.qr_codes;
create policy qr_codes_select_owner on public.qr_codes
  for select to authenticated
  using (user_id = auth.uid());
comment on policy qr_codes_select_owner on public.qr_codes is
  'RATIONALE: asesor ve sus QRs propios.';

drop policy if exists qr_codes_select_admin on public.qr_codes;
create policy qr_codes_select_admin on public.qr_codes
  for select to authenticated
  using (public.rls_is_admin());
comment on policy qr_codes_select_admin on public.qr_codes is
  'RATIONALE: superadmin override.';

drop policy if exists qr_codes_insert_owner on public.qr_codes;
create policy qr_codes_insert_owner on public.qr_codes
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists qr_codes_update_owner on public.qr_codes;
create policy qr_codes_update_owner on public.qr_codes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists qr_codes_delete_owner on public.qr_codes;
create policy qr_codes_delete_owner on public.qr_codes
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.qr_codes to authenticated;
