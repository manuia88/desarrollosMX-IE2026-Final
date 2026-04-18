-- RLS canónicas + VIEWs públicas para desarrolladoras, agencies, broker_companies
-- FASE 02 / MÓDULO 2.F.1 (ADR-009 D5)
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.F.1

-- ============================================================
-- desarrolladoras
-- ============================================================
drop policy if exists desarrolladoras_select_own_tenant on public.desarrolladoras;

create policy desarrolladoras_select_members on public.desarrolladoras
  for select to authenticated
  using (
    public.is_superadmin()
    or id in (select desarrolladora_id from public.profiles where id = auth.uid())
    or (is_verified = true and is_active = true)
  );

create policy desarrolladoras_update_admins on public.desarrolladoras
  for update to authenticated
  using (
    public.is_superadmin()
    or id in (
      select desarrolladora_id from public.profiles
      where id = auth.uid() and rol = 'admin_desarrolladora'
    )
  )
  with check (
    public.is_superadmin()
    or id in (
      select desarrolladora_id from public.profiles
      where id = auth.uid() and rol = 'admin_desarrolladora'
    )
  );

create policy desarrolladoras_insert_super on public.desarrolladoras
  for insert to authenticated
  with check (public.is_superadmin());

create or replace view public.public_desarrolladoras
with (security_invoker = true)
as
select id, country_code, name, website, logo_url, slug, is_verified, created_at
from public.desarrolladoras
where is_verified and is_active;

grant select on public.public_desarrolladoras to anon, authenticated;

comment on view public.public_desarrolladoras is
  'VIEW pública sin PII (tax_id/contact_email/contact_phone/verification_docs_urls). ADR-009 D5.';

-- ============================================================
-- agencies
-- ============================================================
drop policy if exists agencies_select_own_tenant on public.agencies;

create policy agencies_select_members on public.agencies
  for select to authenticated
  using (
    public.is_superadmin()
    or id in (select agency_id from public.profiles where id = auth.uid())
    or (is_verified = true and is_active = true)
  );

create policy agencies_update_super on public.agencies
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy agencies_insert_super on public.agencies
  for insert to authenticated
  with check (public.is_superadmin());

create or replace view public.public_agencies
with (security_invoker = true)
as
select id, country_code, name, logo_url, slug, is_verified, created_at
from public.agencies
where is_verified and is_active;

grant select on public.public_agencies to anon, authenticated;

-- ============================================================
-- broker_companies
-- ============================================================
drop policy if exists broker_companies_select_own_tenant on public.broker_companies;

create policy broker_companies_select_members on public.broker_companies
  for select to authenticated
  using (
    public.is_superadmin()
    or id in (select broker_company_id from public.profiles where id = auth.uid())
    or (is_authorized_broker = true and is_active = true)
  );

create policy broker_companies_update_admins on public.broker_companies
  for update to authenticated
  using (
    public.is_superadmin()
    or id in (
      select broker_company_id from public.profiles
      where id = auth.uid() and rol in ('broker_manager', 'mb_admin')
    )
  )
  with check (
    public.is_superadmin()
    or id in (
      select broker_company_id from public.profiles
      where id = auth.uid() and rol in ('broker_manager', 'mb_admin')
    )
  );

create policy broker_companies_insert_super on public.broker_companies
  for insert to authenticated
  with check (public.is_superadmin());

create or replace view public.public_broker_companies
with (security_invoker = true)
as
select id, country_code, name, logo_url, slug, is_authorized_broker, created_at
from public.broker_companies
where is_authorized_broker and is_active;

grant select on public.public_broker_companies to anon, authenticated;
