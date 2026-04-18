-- plans y subscriptions
-- FASE 01 / MÓDULO 1.C.4
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.C.4

-- ============================================================
-- plans (catálogo de planes por audience + country)
-- ============================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  audience text not null check (audience in ('asesor','desarrolladora','broker_company','comprador')),
  country_code char(2) not null references public.countries(code),
  monthly_price_minor int not null,
  yearly_price_minor int,
  currency char(3) not null references public.currencies(code),
  trial_days smallint not null default 0,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  features_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_plans_country_audience on public.plans (country_code, audience) where is_active;

create trigger trg_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

-- Listado de planes es público (pricing marketplace). Solo filas activas.
create policy plans_select_public on public.plans
  for select to authenticated, anon
  using (is_active = true);

-- ============================================================
-- subscriptions (1 por subject activo; FASE 23 Stripe/MP)
-- ============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  subject_type text not null check (subject_type in ('profile','desarrolladora','broker_company')),
  subject_id uuid not null,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('trialing','active','past_due','canceled','expired')),
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at timestamptz,
  canceled_at timestamptz,
  stripe_subscription_id text,
  mercadopago_subscription_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subs_country_subject on public.subscriptions (country_code, subject_type, subject_id);
create index idx_subs_status on public.subscriptions (status, current_period_end);

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Policy stub (FASE 02/23 amplía a superadmin + billing views):
-- profile ve su propia subscription; tenant owners cubiertos en Fase 02 vía helpers.
create policy subscriptions_select_own_profile on public.subscriptions
  for select to authenticated
  using (subject_type = 'profile' and subject_id = auth.uid());
