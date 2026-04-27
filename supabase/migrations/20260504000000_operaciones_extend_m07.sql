-- F2.14.B M07 — Extend operaciones (canonical schema asesor wizard)
-- ALTER TABLE: add codigo unique, side, status FSM, valores desglosados (reserva/promocion/cierre),
-- fx_rate, propiedad_type+id, completion_pct, cancellation_reason, asesor_id (owner directo).
-- Relax deal_id NOT NULL → nullable + partial unique index (preserva cascade FASE 07.7.B futuro).
-- Trigger codigo auto-gen pattern {3-alphanum}-{4-initials}-{4-initials}.
-- RLS extiende para visibility via asesor_id directo (operaciones standalone wizard).

alter table public.operaciones
  alter column deal_id drop not null;

alter table public.operaciones
  drop constraint if exists operaciones_deal_unique;

create unique index if not exists operaciones_deal_id_unique_idx
  on public.operaciones(deal_id)
  where deal_id is not null;

alter table public.operaciones
  add column if not exists asesor_id uuid references public.profiles(id) on delete restrict,
  add column if not exists codigo text,
  add column if not exists side text,
  add column if not exists status text not null default 'propuesta',
  add column if not exists fecha_cierre date,
  add column if not exists reserva_amount numeric(14,2),
  add column if not exists reserva_currency char(3),
  add column if not exists promocion_amount numeric(14,2),
  add column if not exists promocion_currency char(3),
  add column if not exists cierre_amount numeric(14,2),
  add column if not exists cierre_currency char(3),
  add column if not exists fx_rate numeric(12,6),
  add column if not exists fx_rate_date date,
  add column if not exists propiedad_type text,
  add column if not exists propiedad_id uuid,
  add column if not exists completion_pct integer not null default 0,
  add column if not exists cancellation_reason text,
  add column if not exists notas text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'operaciones_codigo_unique'
  ) then
    alter table public.operaciones
      add constraint operaciones_codigo_unique unique (codigo);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'operaciones_side_check') then
    alter table public.operaciones
      add constraint operaciones_side_check check (side is null or side in ('ambos','comprador','vendedor'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'operaciones_status_check') then
    alter table public.operaciones
      add constraint operaciones_status_check check (status in ('propuesta','oferta_aceptada','escritura','cerrada','pagando','cancelada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'operaciones_propiedad_type_check') then
    alter table public.operaciones
      add constraint operaciones_propiedad_type_check check (
        propiedad_type is null or propiedad_type in ('proyecto','unidad','propiedad_secundaria')
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'operaciones_completion_pct_check') then
    alter table public.operaciones
      add constraint operaciones_completion_pct_check check (completion_pct between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'operaciones_currency_iso_reserva') then
    alter table public.operaciones
      add constraint operaciones_currency_iso_reserva check (
        reserva_currency is null or reserva_currency = any (array['MXN','USD','COP','ARS','BRL'])
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'operaciones_currency_iso_promocion') then
    alter table public.operaciones
      add constraint operaciones_currency_iso_promocion check (
        promocion_currency is null or promocion_currency = any (array['MXN','USD','COP','ARS','BRL'])
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'operaciones_currency_iso_cierre') then
    alter table public.operaciones
      add constraint operaciones_currency_iso_cierre check (
        cierre_currency is null or cierre_currency = any (array['MXN','USD','COP','ARS','BRL'])
      );
  end if;
end $$;

create index if not exists operaciones_asesor_status_idx
  on public.operaciones(asesor_id, status);
create index if not exists operaciones_status_idx
  on public.operaciones(status);

create or replace function public.operaciones_generate_codigo()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public
  as $$
declare
  rand_block text;
  initials_a text;
  initials_b text;
  candidate text;
  attempts integer := 0;
begin
  if new.codigo is not null then
    return new;
  end if;
  loop
    rand_block := upper(substring(translate(encode(gen_random_bytes(4),'base64'),'+/=','')::text, 1, 3));
    initials_a := upper(substring(md5(coalesce(new.id::text, gen_random_uuid()::text) || clock_timestamp()::text) from 1 for 4));
    initials_b := upper(substring(md5(coalesce(new.asesor_id::text, '') || clock_timestamp()::text) from 1 for 4));
    candidate := rand_block || '-' || initials_a || '-' || initials_b;
    exit when not exists (select 1 from public.operaciones where codigo = candidate);
    attempts := attempts + 1;
    if attempts >= 5 then
      candidate := rand_block || '-' || initials_a || '-' || substring(md5(random()::text) from 1 for 4);
      exit;
    end if;
  end loop;
  new.codigo := candidate;
  return new;
end;
$$;

drop trigger if exists trg_operaciones_generate_codigo on public.operaciones;
create trigger trg_operaciones_generate_codigo
  before insert on public.operaciones
  for each row execute function public.operaciones_generate_codigo();

update public.operaciones
set codigo = upper(substring(md5(id::text) from 1 for 3)) || '-' ||
             upper(substring(md5(id::text) from 4 for 4)) || '-' ||
             upper(substring(md5(id::text) from 8 for 4))
where codigo is null;

drop policy if exists operaciones_select_asesor_owner on public.operaciones;
create policy operaciones_select_asesor_owner on public.operaciones
  for select to authenticated
  using (
    public.rls_is_asesor() and asesor_id = auth.uid()
  );
comment on policy operaciones_select_asesor_owner on public.operaciones is
  'F14.B M07 — asesor ve operación si es owner directo (asesor_id). Cross-table policy via operacion_parts añadida post-creación parts table.';

drop policy if exists operaciones_insert_asesor on public.operaciones;
create policy operaciones_insert_asesor on public.operaciones
  for insert to authenticated
  with check (
    public.rls_is_asesor() and asesor_id = auth.uid()
  );
comment on policy operaciones_insert_asesor on public.operaciones is
  'F14.B M07 — asesor crea operación standalone (wizard) con sí mismo como owner.';

drop policy if exists operaciones_update_asesor on public.operaciones;
create policy operaciones_update_asesor on public.operaciones
  for update to authenticated
  using (
    public.rls_is_asesor() and asesor_id = auth.uid()
  )
  with check (
    public.rls_is_asesor() and asesor_id = auth.uid()
  );
comment on policy operaciones_update_asesor on public.operaciones is
  'F14.B M07 — asesor actualiza operación propia (status FSM, valores, notas).';

comment on column public.operaciones.codigo is
  'Código humano único pattern {3-alphanum}-{4-initials}-{4-initials}. Auto-gen trigger.';
comment on column public.operaciones.side is
  'Lado del asesor: ambos/comprador/vendedor. ÚNICA columna (NO lado duplicado, ADR-049).';
comment on column public.operaciones.status is
  'FSM operación: propuesta → oferta_aceptada → escritura → cerrada → pagando / cancelada. Independiente fiscal_status.';
comment on column public.operaciones.completion_pct is
  'Progreso 0-100 calculable según status (propuesta=15, oferta_aceptada=35, escritura=60, cerrada=85, pagando=95, cancelada=0).';
comment on column public.operaciones.propiedad_type is
  'Tipo polimórfico: proyecto/unidad/propiedad_secundaria. propiedad_id apunta sin FK estricto (validación app-layer).';
comment on column public.operaciones.asesor_id is
  'Owner directo asesor (auth.uid() del creador del wizard). Complementa deal_id legacy cascade.';
