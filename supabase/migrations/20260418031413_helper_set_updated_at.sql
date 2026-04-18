-- Helper trigger function: set_updated_at
-- FASE 01 / MÓDULO 1.D.4 (adelantado por dependencia de triggers en BLOQUE 1.C)
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.D.4

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: set updated_at column to now() on BEFORE UPDATE.';
