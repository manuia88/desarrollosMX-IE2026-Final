-- FASE 08 / BLOQUE 8.B / Upgrades P1 (valid_until) + S1 (RLS country filter).
-- Refs: prompt v4 upgrades P1+S1.
--       shared/lib/intelligence-engine/calculators/persist.ts
--       shared/lib/intelligence-engine/calculators/base.ts
--
-- P1 — Separar validity window de period_date
--   period_date = cuándo se computó el score
--   valid_until = hasta cuándo es válido (H09 commute 7d, F01-F05 30d, B12 INPP 3m)
--   persist.ts setea valid_until = computed_at + methodology.validity al UPSERT.
--   Habilita UI "score válido hasta 2026-07" y cache H09 on-demand via valid_until>now().
--
-- S1 — RLS cross-tenant country filter
--   Query U13 comparable_zones hace SELECT FROM zone_scores sin filtrar country.
--   Con data H2 multi-país, authenticated user MX no debe ver comparables CO/AR/BR.
--   Reemplaza policy 'using (true)' por filtro con profiles.country_code o
--   is_superadmin (pattern embeddings_select_country 20260418052000).
--   user_scores mantiene user_id = auth.uid() — más restrictivo, no se toca.

-- ============================================================
-- P1 — valid_until en las 3 tablas de scores
-- ============================================================
alter table public.zone_scores
  add column if not exists valid_until timestamptz;

alter table public.project_scores
  add column if not exists valid_until timestamptz;

alter table public.user_scores
  add column if not exists valid_until timestamptz;

comment on column public.zone_scores.valid_until is
  'Timestamp hasta el cual el score se considera válido. persist.ts lo setea =
  computed_at + methodology.validity. Habilita cache H09 on-demand y UI
  "válido hasta X". NULL = sin validez explícita (fallback al period_date).';

comment on column public.project_scores.valid_until is
  'Timestamp hasta el cual el score se considera válido. Ver zone_scores.valid_until.';

comment on column public.user_scores.valid_until is
  'Timestamp hasta el cual el score se considera válido. Ver zone_scores.valid_until.';

create index if not exists idx_zone_scores_valid_until
  on public.zone_scores (score_type, zone_id, valid_until desc nulls last);

-- ============================================================
-- S1 — RLS country filter zone_scores + project_scores
-- ============================================================

-- zone_scores: reemplaza 'using (true)' por filtro country vs profiles.
drop policy if exists zone_scores_select_internal on public.zone_scores;

create policy zone_scores_select_country on public.zone_scores
  for select to authenticated
  using (
    public.is_superadmin()
    or country_code in (
      select country_code from public.profiles where id = auth.uid()
    )
  );

comment on policy zone_scores_select_country on public.zone_scores is
  'S1 — SELECT filtrado por country del user (profiles.country_code) o superadmin. '
  'Habilita comparable_zones U13 multi-país sin leak cross-tenant.';

-- project_scores: mismo patrón.
drop policy if exists project_scores_select_internal on public.project_scores;

create policy project_scores_select_country on public.project_scores
  for select to authenticated
  using (
    public.is_superadmin()
    or country_code in (
      select country_code from public.profiles where id = auth.uid()
    )
  );

comment on policy project_scores_select_country on public.project_scores is
  'S1 — SELECT filtrado por country del user o superadmin.';

-- user_scores — ya tiene 'using (user_id = auth.uid())' que es más restrictivo.
-- No requiere cambios.
