-- F2.14.B M07 — Create operacion_commissions (% comision + IVA + split DMX 80/20)
-- 1:1 con operacion (UNIQUE operacion_id). Calculated columns generated stored: comision_amount,
-- iva_amount, total_with_iva, split_dmx_amount, split_inmobiliaria_amount.

create table if not exists public.operacion_commissions (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null unique references public.operaciones(id) on delete cascade,
  base_amount numeric(14,2) not null check (base_amount >= 0),
  comision_pct numeric(5,2) not null check (comision_pct >= 0 and comision_pct <= 100),
  iva_pct numeric(5,2) not null default 16.0 check (iva_pct >= 0 and iva_pct <= 100),
  split_dmx_pct numeric(5,2) not null default 20.0 check (split_dmx_pct >= 0 and split_dmx_pct <= 100),
  comision_amount numeric(14,2) generated always as (round(base_amount * comision_pct / 100, 2)) stored,
  iva_amount numeric(14,2) generated always as (round(base_amount * comision_pct / 100 * iva_pct / 100, 2)) stored,
  total_with_iva numeric(14,2) generated always as (
    round(base_amount * comision_pct / 100 * (1 + iva_pct / 100), 2)
  ) stored,
  split_dmx_amount numeric(14,2) generated always as (
    round(base_amount * comision_pct / 100 * split_dmx_pct / 100, 2)
  ) stored,
  split_inmobiliaria_amount numeric(14,2) generated always as (
    round(base_amount * comision_pct / 100 * (1 - split_dmx_pct / 100), 2)
  ) stored,
  declaracion_jurada boolean not null default false,
  factura_attachment_id uuid,
  currency char(3) not null check (currency = any (array['MXN','USD','COP','ARS','BRL'])),
  created_at timestamptz not null default now()
);

comment on table public.operacion_commissions is
  'F14.B M07 — Comision operación con split DMX 80/20 EXPLÍCITO + IVA 16% México auto-calc. Generated columns canonical (NO trigger app-layer drift).';
comment on column public.operacion_commissions.split_dmx_pct is
  'Porcentaje DMX. Canon H1 = 20.0. Editable founder admin.';
comment on column public.operacion_commissions.declaracion_jurada is
  'Checkbox UI obligatorio "datos correctos" (compliance asesor). Audit_log entry on insert.';

create index if not exists operacion_commissions_operacion_idx
  on public.operacion_commissions(operacion_id);

alter table public.operacion_commissions enable row level security;

drop policy if exists operacion_commissions_select on public.operacion_commissions;
create policy operacion_commissions_select on public.operacion_commissions
  for select to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_commissions.operacion_id and o.asesor_id = auth.uid()
    )
    or exists (
      select 1 from public.operacion_parts op
      where op.operacion_id = operacion_commissions.operacion_id and op.asesor_id = auth.uid()
    )
  );
comment on policy operacion_commissions_select on public.operacion_commissions is
  'RATIONALE: visible al owner, asesor parte, o admin.';

drop policy if exists operacion_commissions_insert on public.operacion_commissions;
create policy operacion_commissions_insert on public.operacion_commissions
  for insert to authenticated
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_commissions.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_commissions_update on public.operacion_commissions;
create policy operacion_commissions_update on public.operacion_commissions
  for update to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_commissions.operacion_id and o.asesor_id = auth.uid()
    )
  )
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_commissions.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_commissions_no_delete on public.operacion_commissions;
create policy operacion_commissions_no_delete on public.operacion_commissions
  for delete to authenticated
  using (public.rls_is_admin());
