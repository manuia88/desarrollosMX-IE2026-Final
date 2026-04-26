-- FASE 07.7.A.4 — CRM Foundation: 4 catálogos canónicos
-- Catalogs extensibles (D2 ADR-033 + D4 ADR-035): persona_types, lead_sources, deal_stages, retention_policies
-- Ref: ADR-009 (security model RLS) · ADR-018 (E2E + audit canon) · ADR-049 (operaciones canon)

-- ============================================================
-- persona_types — catalog extensible (ADR-033)
-- ============================================================
create table public.persona_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_es text not null,
  label_en text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint persona_types_slug_format check (slug ~ '^[a-z][a-z0-9_]{2,40}$')
);

create index idx_persona_types_active on public.persona_types (slug) where active;

create trigger trg_persona_types_updated_at
  before update on public.persona_types
  for each row execute function public.set_updated_at();

alter table public.persona_types enable row level security;

create policy persona_types_select_public on public.persona_types
  for select to anon, authenticated using (true);
comment on policy persona_types_select_public on public.persona_types is
  'intentional_public — catalog extensible no-PII (ADR-033). Lectura para selectors UI.';

create policy persona_types_admin_write on public.persona_types
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
comment on policy persona_types_admin_write on public.persona_types is
  'RATIONALE: catalog curado por superadmin. Cambios slug/label propagan a UI multi-país.';

comment on table public.persona_types is
  'Catalog extensible buyer_twins persona types (ADR-033). 6 seeds canon: buyer_self, asesor_lead, investor, masterbroker, family_member, referrer.';

insert into public.persona_types (slug, label_es, label_en, description) values
  ('buyer_self',    'Comprador (yo mismo)',  'Buyer (self)',     'Comprador final autoservicio del portal comprador.'),
  ('asesor_lead',   'Lead asesor',           'Advisor lead',     'Prospecto manejado por asesor en CRM.'),
  ('investor',      'Inversionista',         'Investor',         'Inversor inmobiliario (residencial/comercial/STR).'),
  ('masterbroker',  'Masterbroker',          'Masterbroker',     'Broker que opera red de asesores cross-agencia.'),
  ('family_member', 'Miembro de familia',    'Family member',    'Miembro de family_unit no-primario (cónyuge, hijo, etc.).'),
  ('referrer',      'Referidor',             'Referrer',         'Persona que refiere leads sin participar en operación directa.')
on conflict (slug) do nothing;

-- ============================================================
-- lead_sources — catalog canales adquisición leads
-- ============================================================
create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_es text not null,
  label_en text not null,
  attribution_weight numeric(5,4) not null default 1.0000
    check (attribution_weight >= 0 and attribution_weight <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_sources_slug_format check (slug ~ '^[a-z][a-z0-9_]*$')
);

create index idx_lead_sources_active on public.lead_sources (active) where active;

create trigger trg_lead_sources_updated_at
  before update on public.lead_sources
  for each row execute function public.set_updated_at();

alter table public.lead_sources enable row level security;

create policy lead_sources_select_authed on public.lead_sources
  for select to authenticated using (true);
comment on policy lead_sources_select_authed on public.lead_sources is
  'RATIONALE intentional_public_authed: catálogo lectura abierta a authenticated. Sin PII. Necesario selectors UI.';

create policy lead_sources_admin_write on public.lead_sources
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
comment on policy lead_sources_admin_write on public.lead_sources is
  'RATIONALE: catalog curado por superadmin. attribution_weight afecta scoring asistido cross-país.';

comment on table public.lead_sources is
  'Catalog canales origen leads (whatsapp, web, ferretería, etc). 8 seeds canon. attribution_weight 0..1 para scoring.';

insert into public.lead_sources (slug, label_es, label_en, attribution_weight) values
  ('whatsapp',          'WhatsApp',                'WhatsApp',          1.0000),
  ('web_organic',       'Web orgánico',            'Web (organic)',     0.9000),
  ('web_paid',          'Web pago (Ads)',          'Web (paid ads)',    0.7500),
  ('ferreteria',        'Ferretería',              'Hardware store',    0.8000),
  ('casa_abierta',      'Casa abierta',            'Open house',        0.9500),
  ('listing_inbound',   'Listing inbound',         'Listing inbound',   0.8500),
  ('referral',          'Referido',                'Referral',          1.0000),
  ('partner_developer', 'Partner desarrolladora',  'Developer partner', 0.9000)
on conflict (slug) do nothing;

-- ============================================================
-- deal_stages — catalog FSM canónico pipeline deals
-- ============================================================
create table public.deal_stages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  order_index smallint not null unique,
  label_es text not null,
  label_en text not null,
  is_terminal boolean not null default false,
  is_won boolean not null default false,
  created_at timestamptz not null default now(),
  constraint deal_stages_slug_format check (slug ~ '^[a-z][a-z0-9_]*$'),
  constraint deal_stages_won_implies_terminal check (
    (is_won = false) or (is_terminal = true)
  )
);

create index idx_deal_stages_order on public.deal_stages (order_index);

alter table public.deal_stages enable row level security;

create policy deal_stages_select_authed on public.deal_stages
  for select to authenticated using (true);
comment on policy deal_stages_select_authed on public.deal_stages is
  'RATIONALE intentional_public_authed: FSM canon lectura abierta. Necesario kanban + UI stage selector.';

create policy deal_stages_admin_write on public.deal_stages
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
comment on policy deal_stages_admin_write on public.deal_stages is
  'RATIONALE: FSM changes pueden romper triggers cascade (closed_won → operacion). Solo superadmin.';

comment on table public.deal_stages is
  'FSM canónico etapas deals. 7 seeds: lead, qualified, showing, offer, contract, closed_won, closed_lost. is_won=true requiere is_terminal=true.';

insert into public.deal_stages (slug, order_index, label_es, label_en, is_terminal, is_won) values
  ('lead',         0, 'Lead',                'Lead',         false, false),
  ('qualified',    1, 'Calificado',          'Qualified',    false, false),
  ('showing',      2, 'Visita',              'Showing',      false, false),
  ('offer',        3, 'Oferta',              'Offer',        false, false),
  ('contract',     4, 'Contrato',            'Contract',     false, false),
  ('closed_won',   5, 'Cerrado ganado',      'Closed won',   true,  true),
  ('closed_lost',  6, 'Cerrado perdido',     'Closed lost',  true,  false)
on conflict (slug) do nothing;

-- ============================================================
-- retention_policies — multi-country compliance (ADR-035)
-- ============================================================
create table public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  entity_type text not null
    check (entity_type in (
      'lead', 'deal', 'operacion', 'buyer_twin',
      'fiscal_doc', 'behavioral_signal', 'audit_crm_log'
    )),
  retention_years smallint not null check (retention_years between 1 and 50),
  jurisdiction_ref text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, entity_type)
);

create index idx_retention_country on public.retention_policies (country_code);
create index idx_retention_entity on public.retention_policies (entity_type);

create trigger trg_retention_policies_updated_at
  before update on public.retention_policies
  for each row execute function public.set_updated_at();

alter table public.retention_policies enable row level security;

create policy retention_policies_select_authed on public.retention_policies
  for select to authenticated using (true);
comment on policy retention_policies_select_authed on public.retention_policies is
  'RATIONALE intentional_public_authed: config compliance pública per-país. NO PII. Frontend muestra "tus datos retenidos X años per ley Y".';

create policy retention_policies_admin_write on public.retention_policies
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
comment on policy retention_policies_admin_write on public.retention_policies is
  'RATIONALE: políticas legal/compliance. Solo superadmin con review legal.';

comment on table public.retention_policies is
  'Retention multi-país (ADR-035). 28 seeds = 4 países × 7 entity_types. Cron crm_retention_cleanup (FASE 06 STUB) lee y aplica DELETE/anonymize.';

-- Seeds 28: 4 países × 7 entity_types. country_code char(2) matchea audit_log + profiles canon.
insert into public.retention_policies (country_code, entity_type, retention_years, jurisdiction_ref, notes) values
  -- MX (LFPDPPP + CFF Art. 30)
  ('MX', 'lead',              5,  'LFPDPPP',         '5y post-última actividad — tiempo necesario para finalidad'),
  ('MX', 'deal',              5,  'LFPDPPP',         '5y post-cierre o cancelación'),
  ('MX', 'operacion',         5,  'CFF-Art30',       '5y mínimo libros contables CFF; PII anonymizable'),
  ('MX', 'buyer_twin',        5,  'LFPDPPP',         'Buyer twin = persona PII derivada → 5y'),
  ('MX', 'fiscal_doc',        5,  'CFF-Art30',       'CFDI documents 5y mínimo (10y archive cold)'),
  ('MX', 'behavioral_signal', 2,  'LFPDPPP',         'Telemetría — 2y privacy minimization'),
  ('MX', 'audit_crm_log',     7,  'CFF-Art30',       'Audit forense — 7y CFF mínimo + buenas prácticas'),
  -- CO (Ley 1581 + DIAN Art. 632 ET)
  ('CO', 'lead',              10, 'DIAN-Art632ET',   '10y DIAN + Ley 1581'),
  ('CO', 'deal',              10, 'DIAN-Art632ET',   '10y comercial + fiscal'),
  ('CO', 'operacion',         10, 'DIAN-Art632ET',   '10y soportes contables CO'),
  ('CO', 'buyer_twin',        10, 'DIAN-Art632ET',   'Conservador alineado con deal'),
  ('CO', 'fiscal_doc',        10, 'DIAN-Art632ET',   'DIAN 10y soportes contables'),
  ('CO', 'behavioral_signal', 2,  'Ley1581',         '2y privacy minimization'),
  ('CO', 'audit_crm_log',     10, 'DIAN-Art632ET',   'Audit forense 10y max regional'),
  -- AR (Ley 25.326 + AFIP)
  ('AR', 'lead',              7,  'AFIP-RG4290',     '7y conservador AFIP + Ley 25.326'),
  ('AR', 'deal',              7,  'AFIP-RG4290',     '7y comercial AR'),
  ('AR', 'operacion',         7,  'AFIP-RG4290',     '7y soportes contables AR'),
  ('AR', 'buyer_twin',        7,  'AFIP-RG4290',     'Conservador alineado con deal'),
  ('AR', 'fiscal_doc',        10, 'AFIP-RG1415',     'AFIP 10y facturación electrónica'),
  ('AR', 'behavioral_signal', 2,  'Ley25326',        '2y privacy minimization'),
  ('AR', 'audit_crm_log',     10, 'AFIP-RG4290',     'Audit forense 10y AR'),
  -- BR (LGPD + Receita CTN Art. 195)
  ('BR', 'lead',              7,  'Receita-CTN195',  '7y conservador Receita + LGPD'),
  ('BR', 'deal',              7,  'Receita-CTN195',  '7y comercial BR'),
  ('BR', 'operacion',         7,  'Receita-CTN195',  '7y soportes contables BR'),
  ('BR', 'buyer_twin',        7,  'Receita-CTN195',  'Conservador alineado con deal'),
  ('BR', 'fiscal_doc',        7,  'Receita-CTN195',  'Receita 5-7y NFS-e + facturas'),
  ('BR', 'behavioral_signal', 2,  'LGPD',            '2y privacy minimization'),
  ('BR', 'audit_crm_log',     10, 'Receita-CTN195',  'Audit forense 10y BR')
on conflict (country_code, entity_type) do nothing;
