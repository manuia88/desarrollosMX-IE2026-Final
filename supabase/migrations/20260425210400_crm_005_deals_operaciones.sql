-- FASE 07.7.A.4 — CRM Foundation: deals + operaciones
-- ADR-049 canonical: operaciones (no operations).
-- Schema MINIMALISTA A.4 — parts/commissions detalle → 07.7.B tablas relacionadas.

create table public.deals (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null references public.leads(id) on delete restrict,
  zone_id uuid not null references public.zones(id) on delete restrict,
  property_id uuid,    -- pre-FASE 11.X: NO FK (projects/unidades/propiedades_secundarias polimórficas)

  stage_id uuid not null references public.deal_stages(id) on delete restrict,

  amount numeric(14,2) not null check (amount > 0),
  amount_currency char(3) not null references public.currencies(code),
  country_code char(2) not null references public.countries(code),

  asesor_id uuid not null references auth.users(id) on delete restrict,

  probability numeric(5,2) not null default 50.00
    check (probability >= 0 and probability <= 100),

  expected_close_date date,
  actual_close_date date,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint deals_country_supported check (country_code in ('MX','CO','AR','BR','US')),
  constraint deals_currency_supported check (amount_currency in ('MXN','COP','ARS','BRL','USD')),
  constraint deals_close_date_when_won check (
    (actual_close_date is null) or (actual_close_date <= current_date + interval '1 year')
  )
);

create index idx_deals_lead on public.deals (lead_id);
create index idx_deals_zone on public.deals (zone_id);
create index idx_deals_stage on public.deals (stage_id);
create index idx_deals_asesor on public.deals (asesor_id);
create index idx_deals_country on public.deals (country_code);
create index idx_deals_expected_close on public.deals (expected_close_date)
  where expected_close_date is not null;
create index idx_deals_actual_close on public.deals (actual_close_date)
  where actual_close_date is not null;

create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

alter table public.deals enable row level security;

comment on table public.deals is
  'Oportunidades comerciales activas. stage_id apunta a deal_stages FSM. Cierre exitoso (closed_won) cascade trigger genera operaciones row.';

comment on column public.deals.property_id is
  'Placeholder pre-FASE 11.X. FK polimórfico cuando properties (projects/unidades/propiedades_secundarias) se unifiquen.';

-- ============================================================
-- operaciones — ADR-049 canonical (no `operations`)
-- ============================================================
create table public.operaciones (
  id uuid primary key default gen_random_uuid(),

  deal_id uuid not null references public.deals(id) on delete restrict,

  operacion_type text not null
    check (operacion_type in ('venta','renta','preventa','reventa')),

  amount numeric(14,2) not null check (amount > 0),
  amount_currency char(3) not null references public.currencies(code),

  commission_amount numeric(14,2) not null default 0
    check (commission_amount >= 0),
  commission_currency char(3) references public.currencies(code),

  closed_at timestamptz not null default now(),

  fiscal_status text not null default 'pending'
    check (fiscal_status in ('pending','invoiced','paid')),

  cfdi_uuid text,    -- MX SAT — UNIQUE INDEX cuando NOT NULL

  country_code char(2) not null references public.countries(code),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operaciones_country_supported check (country_code in ('MX','CO','AR','BR','US')),
  constraint operaciones_currency_supported check (amount_currency in ('MXN','COP','ARS','BRL','USD')),
  constraint operaciones_commission_currency_supported check (
    commission_currency is null or commission_currency in ('MXN','COP','ARS','BRL','USD')
  ),
  constraint operaciones_commission_currency_when_amount check (
    (commission_amount = 0) or (commission_currency is not null)
  ),
  constraint operaciones_deal_unique unique (deal_id)
);

create index idx_operaciones_deal on public.operaciones (deal_id);
create index idx_operaciones_closed_at on public.operaciones (closed_at desc);
create index idx_operaciones_fiscal_status on public.operaciones (fiscal_status);
create index idx_operaciones_country on public.operaciones (country_code);
create unique index idx_operaciones_cfdi_unique on public.operaciones (cfdi_uuid)
  where cfdi_uuid is not null;

create trigger trg_operaciones_updated_at
  before update on public.operaciones
  for each row execute function public.set_updated_at();

alter table public.operaciones enable row level security;

comment on table public.operaciones is
  'Cierres comerciales fiscales (ADR-049). 1:1 deals.closed_won (UNIQUE deal_id). cfdi_uuid MX SAT requerido para fiscal_status=invoiced en MX. Schema MINIMALISTA — parts/commissions detalle 07.7.B.';

comment on column public.operaciones.cfdi_uuid is
  'CFDI 4.0 MX SAT UUID (36 chars con guiones). CO=DIAN, AR=AFIP, BR=NFS-e — campos dedicados en 07.7.B fiscal_docs.';
