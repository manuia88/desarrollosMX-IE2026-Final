-- FASE 07.7.A.4 — CRM Foundation: leads (top of funnel CRM)
-- FKs: auth.users (NULL ok = anonymous), zones, lead_sources, profiles (assigned_asesor)
-- Multi-country día 1 (D13): country_code char(2) matchea profiles canon.

create table public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Identidad opcional (lead anónimo permitido día 1)
  user_id uuid references auth.users(id) on delete set null,

  -- Geo + atribución
  zone_id uuid not null references public.zones(id) on delete restrict,
  source_id uuid not null references public.lead_sources(id) on delete restrict,
  country_code char(2) not null references public.countries(code),

  -- FSM lead-side (pre-deal)
  status text not null default 'new'
    check (status in ('new','qualified','nurturing','converted','lost')),

  -- Contacto (al menos uno requerido)
  contact_name text not null,
  contact_email text,
  contact_phone text,

  -- Asignación + tenant
  assigned_asesor_id uuid references auth.users(id) on delete set null,
  brokerage_id uuid,    -- placeholder pre-FASE 13 (sin FK aún — broker_companies aggregation se canoniza FASE 13)

  -- Scoring + telemetría discrecional
  qualification_score numeric(5,2) not null default 0
    check (qualification_score >= 0 and qualification_score <= 100),
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_country_supported check (country_code in ('MX','CO','AR','BR','US')),
  -- Al menos email o phone
  constraint leads_contact_min check (
    (contact_email is not null and length(trim(contact_email)) > 0)
    or
    (contact_phone is not null and length(trim(contact_phone)) > 0)
  )
);

create index idx_leads_user on public.leads (user_id) where user_id is not null;
create index idx_leads_assigned_asesor on public.leads (assigned_asesor_id) where assigned_asesor_id is not null;
create index idx_leads_zone on public.leads (zone_id);
create index idx_leads_source on public.leads (source_id);
create index idx_leads_status on public.leads (status);
create index idx_leads_country on public.leads (country_code);
create index idx_leads_created_desc on public.leads (created_at desc);
create index idx_leads_email on public.leads (lower(contact_email)) where contact_email is not null;
create index idx_leads_phone on public.leads (contact_phone) where contact_phone is not null;

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
-- RLS policies en crm_009 (consolidado).

comment on table public.leads is
  'Top of funnel CRM DMX. user_id null permite leads anónimos (portal público). status pre-deal FSM. Convierte a deal vía RPC lead_to_deal (07.7.D).';

comment on column public.leads.brokerage_id is
  'Placeholder pre-FASE 13. FK a broker_companies cuando masterbroker aggregation se canonice.';

comment on column public.leads.metadata is
  'Telemetría discrecional NO estructurada (utm_*, referrer, device). Para campos hot-path con índice, columna dedicada.';
