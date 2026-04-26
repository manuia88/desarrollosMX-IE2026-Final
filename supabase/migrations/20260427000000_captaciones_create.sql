-- F2.13.F PR-B — M05 Captaciones (asesor pipeline + ACM engine)
-- Crea enums captacion_status + captacion_operacion + tabla captaciones + 8 indexes + 2 triggers + 9 RLS policies.
-- Reusa helpers SECDEF existentes (rls_is_admin/asesor/master_broker) — cero SECDEF nueva.
-- Reusa public.set_updated_at() (canon helper, no touch_updated_at).
-- zone_id FK -> public.zones(id) ON DELETE SET NULL (zones table EXISTS).
-- Audit: 0 SECDEF nuevas, audit_rls_allowlist vN vigente, NO incrementa.

-- ============================================================
-- Enums
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'captacion_status') then
    create type public.captacion_status as enum (
      'prospecto', 'presentacion', 'firmado', 'en_promocion', 'vendido', 'cerrado_no_listado'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'captacion_operacion') then
    create type public.captacion_operacion as enum ('venta', 'renta');
  end if;
end $$;

-- ============================================================
-- Tabla captaciones
-- ============================================================

create table if not exists public.captaciones (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid not null references auth.users(id) on delete set null,
  brokerage_id uuid references public.profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  propietario_nombre text not null check (char_length(propietario_nombre) between 2 and 120),
  propietario_telefono text,
  propietario_email text,
  direccion text not null check (char_length(direccion) between 5 and 200),
  tipo_operacion public.captacion_operacion not null,
  precio_solicitado numeric(14, 2) not null check (precio_solicitado > 0),
  currency char(3) not null default 'MXN'
    check (currency in ('MXN', 'USD', 'COP', 'ARS', 'BRL', 'CLP', 'PEN')),
  country_code char(2) not null,
  zone_id uuid references public.zones(id) on delete set null,
  ciudad text,
  colonia text,
  status public.captacion_status not null default 'prospecto',
  status_changed_at timestamptz not null default now(),
  features jsonb not null default '{}'::jsonb,
  acm_result jsonb,
  acm_computed_at timestamptz,
  closed_at timestamptz,
  closed_motivo text check (
    closed_motivo in ('vendida', 'propietario_decidio_no_vender', 'precio_no_competitivo', 'otro')
  ),
  closed_notes text check (char_length(closed_notes) <= 500),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint captaciones_closed_consistency check (
    (status in ('vendido', 'cerrado_no_listado')) = (closed_at is not null)
  )
);

comment on table public.captaciones is
  'F13.F M05 — Captaciones asesor (pipeline 6 stages prospecto/presentacion/firmado/en_promocion/vendido/cerrado_no_listado + ACM engine 5 dims).';
comment on column public.captaciones.asesor_id is
  'Asesor responsable de la captación. NOT NULL: cada captación pertenece a un asesor.';
comment on column public.captaciones.lead_id is
  'FK opcional a leads cuando captación nace de un contacto existente.';
comment on column public.captaciones.propietario_nombre is
  'Nombre del propietario inline (pre-contactos table H1). FK a contactos en PR-C.';
comment on column public.captaciones.zone_id is
  'FK a public.zones para enlace con zone_pulse_scores en ACM zoneScore dim.';
comment on column public.captaciones.status is
  'FSM 6 stages. Whitelist transitions: prospecto→presentacion→firmado→en_promocion. Cierre: →vendido / →cerrado_no_listado.';
comment on column public.captaciones.status_changed_at is
  'Auto-set por trigger trg_captaciones_status_changed cuando status cambia.';
comment on column public.captaciones.features is
  'jsonb propiedad (recamaras, banos, area_m2, amenidades). Detalle libre H1, normalizar PR-C.';
comment on column public.captaciones.acm_result is
  'Snapshot último runACM: { score, breakdown { priceFit, zoneScore, amenities, sizeFit, discZone }, rationale, weights, inputsHash, computedAt }.';

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_captaciones_asesor on public.captaciones(asesor_id);
create index if not exists idx_captaciones_brokerage on public.captaciones(brokerage_id);
create index if not exists idx_captaciones_lead on public.captaciones(lead_id);
create index if not exists idx_captaciones_status on public.captaciones(status);
create index if not exists idx_captaciones_country on public.captaciones(country_code);
create index if not exists idx_captaciones_zone on public.captaciones(zone_id);
create index if not exists idx_captaciones_created_at on public.captaciones(created_at desc);
create index if not exists idx_captaciones_status_changed
  on public.captaciones(status, status_changed_at desc);

-- ============================================================
-- Triggers (updated_at + status_changed_at)
-- ============================================================

drop trigger if exists trg_captaciones_updated_at on public.captaciones;
create trigger trg_captaciones_updated_at
  before update on public.captaciones
  for each row execute function public.set_updated_at();

create or replace function public.captaciones_touch_status_changed()
  returns trigger
  language plpgsql
  as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_captaciones_status_changed on public.captaciones;
create trigger trg_captaciones_status_changed
  before update of status on public.captaciones
  for each row execute function public.captaciones_touch_status_changed();

-- ============================================================
-- RLS policies
-- ============================================================

alter table public.captaciones enable row level security;

drop policy if exists captaciones_select_asesor_owned on public.captaciones;
create policy captaciones_select_asesor_owned on public.captaciones
  for select to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy captaciones_select_asesor_owned on public.captaciones is
  'RATIONALE: asesor ve captaciones propias. Mismo pattern que busquedas_select_asesor_owned.';

drop policy if exists captaciones_select_admin on public.captaciones;
create policy captaciones_select_admin on public.captaciones
  for select to authenticated
  using (public.rls_is_admin());
comment on policy captaciones_select_admin on public.captaciones is
  'RATIONALE: superadmin override soporte + auditoría.';

drop policy if exists captaciones_select_masterbroker on public.captaciones;
create policy captaciones_select_masterbroker on public.captaciones
  for select to authenticated
  using (
    public.rls_is_master_broker()
    and asesor_id is not null
    and asesor_id in (
      select p.id from public.profiles p
      where p.broker_company_id = (
        select p2.broker_company_id from public.profiles p2 where p2.id = auth.uid()
      ) and p.broker_company_id is not null
    )
  );
comment on policy captaciones_select_masterbroker on public.captaciones is
  'RATIONALE: master broker ve captaciones cuyo asesor pertenece a su broker_company.';

drop policy if exists captaciones_insert_asesor on public.captaciones;
create policy captaciones_insert_asesor on public.captaciones
  for insert to authenticated
  with check (
    public.rls_is_asesor()
    and asesor_id = auth.uid()
    and created_by = auth.uid()
  );
comment on policy captaciones_insert_asesor on public.captaciones is
  'RATIONALE: asesor crea captación asignada a sí mismo. created_by tracking.';

drop policy if exists captaciones_insert_admin on public.captaciones;
create policy captaciones_insert_admin on public.captaciones
  for insert to authenticated
  with check (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy captaciones_insert_admin on public.captaciones is
  'RATIONALE: admin/master broker pueden insertar en nombre de cualquier asesor.';

drop policy if exists captaciones_update_asesor on public.captaciones;
create policy captaciones_update_asesor on public.captaciones
  for update to authenticated
  using (public.rls_is_asesor() and asesor_id = auth.uid())
  with check (public.rls_is_asesor() and asesor_id = auth.uid());
comment on policy captaciones_update_asesor on public.captaciones is
  'RATIONALE: asesor actualiza captaciones propias.';

drop policy if exists captaciones_update_admin on public.captaciones;
create policy captaciones_update_admin on public.captaciones
  for update to authenticated
  using (public.rls_is_admin() or public.rls_is_master_broker())
  with check (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy captaciones_update_admin on public.captaciones is
  'RATIONALE: admin/master broker pueden actualizar dentro del broker.';

drop policy if exists captaciones_delete_admin on public.captaciones;
create policy captaciones_delete_admin on public.captaciones
  for delete to authenticated
  using (public.rls_is_admin() or public.rls_is_master_broker());
comment on policy captaciones_delete_admin on public.captaciones is
  'RATIONALE: solo admin/master broker pueden borrar (asesor cierra, no borra).';
