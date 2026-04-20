-- FASE 08 / BLOQUE 8.F.1 — Tabla tier_requirements.
-- Ref: docs/02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md §BLOQUE 8.F.1 paso 8.F.1.1
--      shared/lib/intelligence-engine/calculators/tier-gate.ts
--
-- Mueve los umbrales tier del hardcoded TIER_FALLBACK a BD. Habilita ajustar
-- min_projects Tier 2 (hoy 10) a otro valor sin redeploy. tierGate() consulta
-- esta tabla con cache in-memory 1h por country (luego refresh).
--
-- Tabla pública (authenticated SELECT): los umbrales son descriptores del
-- producto, no data sensible. service_role mantiene write.

create table if not exists public.tier_requirements (
  tier int primary key check (tier between 1 and 4),
  min_projects int not null default 0,
  min_closed_ops int not null default 0,
  min_months_data int not null default 0,
  description text not null,
  updated_at timestamptz not null default now()
);

comment on table public.tier_requirements is
  'Umbrales para tier gating de scores IE. Tier 1 = día 1 con fuentes externas; '
  'Tier 2-4 incrementales por madurez marketplace. tierGate() lee de aquí.';

insert into public.tier_requirements (tier, min_projects, min_closed_ops, min_months_data, description)
values
  (1, 0, 0, 0, 'Día 1 con fuentes externas'),
  (2, 10, 0, 1, '10 proyectos en zona'),
  (3, 50, 0, 6, '50 proyectos 6 meses'),
  (4, 100, 100, 12, '100 ventas cerradas 12 meses')
on conflict (tier) do update
  set min_projects = excluded.min_projects,
      min_closed_ops = excluded.min_closed_ops,
      min_months_data = excluded.min_months_data,
      description = excluded.description,
      updated_at = now();

alter table public.tier_requirements enable row level security;

drop policy if exists tier_requirements_select_all on public.tier_requirements;
create policy tier_requirements_select_all on public.tier_requirements
  for select to authenticated
  using (true);

drop policy if exists tier_requirements_service_write on public.tier_requirements;
create policy tier_requirements_service_write on public.tier_requirements
  for all to service_role
  using (true) with check (true);

comment on policy tier_requirements_select_all on public.tier_requirements is
  'Umbrales son descriptores de producto, no data sensible. Todo authenticated SELECT.';
