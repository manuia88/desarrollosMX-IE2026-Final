-- FASE 07b / BLOQUE 7b.N — STR Intelligence Reports (B2B 4 tiers).
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.N

create table public.str_reports (
  id uuid primary key default gen_random_uuid(),
  tier smallint not null check (tier between 1 and 4),
  customer_id uuid references public.profiles(id),
  scope jsonb not null,
  status text not null default 'pending' check (
    status in ('pending', 'generating', 'completed', 'failed', 'expired')
  ),
  pdf_url text,
  data_payload jsonb, -- assembly intermedio antes del render PDF.
  error_message text,
  invoice_ref text,
  generated_at timestamptz,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index idx_str_reports_customer
  on public.str_reports (customer_id, requested_at desc) where customer_id is not null;
create index idx_str_reports_tier_status
  on public.str_reports (tier, status, requested_at desc);
create index idx_str_reports_status
  on public.str_reports (status, requested_at);

alter table public.str_reports enable row level security;

-- Customer ve solo sus reports; admin ve todos.
create policy str_reports_select_owner on public.str_reports
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
    or customer_id = auth.uid()
  );

create policy str_reports_insert_authenticated on public.str_reports
  for insert to authenticated
  with check (
    public.is_superadmin()
    or public.get_user_role() in ('mb_admin', 'asesor', 'admin_desarrolladora')
    or customer_id = auth.uid()
  );

create policy str_reports_update_admin on public.str_reports
  for update to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_reports is
  'STR Intelligence Reports — 4 tiers (1=individual owner, 2=alcaldía, 3=gov CDMX anual, '
  '4=API broker). RLS: customer ve sus propios; admin ve todos.';
