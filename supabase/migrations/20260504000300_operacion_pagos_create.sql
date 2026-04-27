-- F2.14.B M07 — Create operacion_pagos (ciclo cobro: pending/paid/closed/expired)
-- 1:N con operación. Cron expira si paid sin closed en 30 días (FASE 16 Contabilidad).

create table if not exists public.operacion_pagos (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null check (currency = any (array['MXN','USD','COP','ARS','BRL'])),
  fecha_pago date not null,
  estado_pago text not null default 'pending'
    check (estado_pago in ('pending','paid','closed','expired')),
  comprobante_attachment_id uuid,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

comment on table public.operacion_pagos is
  'F14.B M07 — Pagos operación. Estados pending/paid/closed/expired. Cron FASE 16 marca expired tras 30d paid sin closed.';

create index if not exists operacion_pagos_operacion_estado_idx
  on public.operacion_pagos(operacion_id, estado_pago);
create index if not exists operacion_pagos_estado_fecha_idx
  on public.operacion_pagos(estado_pago, fecha_pago) where estado_pago = 'paid';

alter table public.operacion_pagos enable row level security;

drop policy if exists operacion_pagos_select on public.operacion_pagos;
create policy operacion_pagos_select on public.operacion_pagos
  for select to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_pagos.operacion_id and o.asesor_id = auth.uid()
    )
    or exists (
      select 1 from public.operacion_parts op
      where op.operacion_id = operacion_pagos.operacion_id and op.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_pagos_insert on public.operacion_pagos;
create policy operacion_pagos_insert on public.operacion_pagos
  for insert to authenticated
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_pagos.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_pagos_update on public.operacion_pagos;
create policy operacion_pagos_update on public.operacion_pagos
  for update to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_pagos.operacion_id and o.asesor_id = auth.uid()
    )
  )
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_pagos.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_pagos_no_delete on public.operacion_pagos;
create policy operacion_pagos_no_delete on public.operacion_pagos
  for delete to authenticated
  using (public.rls_is_admin());
