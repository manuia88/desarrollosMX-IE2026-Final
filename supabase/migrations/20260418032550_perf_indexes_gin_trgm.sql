-- GIN indexes sobre meta JSONB + trigram sobre nombres + compuesto extra profiles
-- FASE 01 / MÓDULO 1.E.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.E.1

-- ============================================================
-- GIN sobre meta JSONB (tablas con columna meta)
-- ============================================================
create index idx_profiles_meta_gin          on public.profiles          using gin (meta);
create index idx_desarrolladoras_meta_gin   on public.desarrolladoras   using gin (meta);
create index idx_agencies_meta_gin          on public.agencies          using gin (meta);
create index idx_broker_companies_meta_gin  on public.broker_companies  using gin (meta);
create index idx_subscriptions_meta_gin     on public.subscriptions     using gin (meta);
create index idx_audit_log_meta_gin         on public.audit_log         using gin (meta);

-- ============================================================
-- GIN trigram sobre nombres (búsqueda fuzzy ILIKE '%juan%')
-- ============================================================
create index idx_profiles_fullname_trgm        on public.profiles         using gin (full_name gin_trgm_ops);
create index idx_desarrolladoras_name_trgm     on public.desarrolladoras  using gin (name      gin_trgm_ops);
create index idx_agencies_name_trgm            on public.agencies         using gin (name      gin_trgm_ops);
create index idx_broker_companies_name_trgm    on public.broker_companies using gin (name      gin_trgm_ops);

-- ============================================================
-- Índice compuesto adicional profiles
-- ============================================================
create index idx_profiles_country_approved
  on public.profiles (country_code, is_approved, is_active);
