-- VIEW public_profiles sin PII + RLS endurecida en profiles
-- FASE 02 / MÓDULO 2.E.1 (ADR-009 D5 / SEC-01)
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.E.1

drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_self_or_super on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_superadmin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

-- profiles_insert_self (FASE 01) se mantiene.

create or replace view public.public_profiles
with (security_invoker = true)
as
select
  id,
  country_code,
  first_name,
  last_name,
  full_name,
  slug,
  avatar_url,
  rol,
  (meta ->> 'bio')::text as bio,
  (meta ->> 'public_portfolio_url')::text as public_portfolio_url,
  created_at
from public.profiles
where is_active = true and is_approved = true;

grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'VIEW segura sin PII (email/phone/rfc/tax_id/razon_social/regimen_fiscal/docs_verificacion_urls). ADR-009 D5. security_invoker=true aplica RLS del caller; en combinación con profiles_select_self_or_super, el filtro is_active+is_approved de la VIEW es lo único visible a anon/authenticated externos.';
