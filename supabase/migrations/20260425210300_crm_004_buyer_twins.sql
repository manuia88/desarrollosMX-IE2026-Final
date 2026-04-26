-- FASE 07.7.A.4 — CRM Foundation: buyer_twins + buyer_twin_traits
-- Container raíz gemelo digital comprador (D2/D7/D10 founder canon)
-- pgvector(384) embedding (sentence-transformers all-MiniLM-L6-v2)

create table public.buyer_twins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  persona_type_id uuid not null references public.persona_types(id) on delete restrict,

  -- Multi-zone interest (no FK array constraint nativo; validar app-side)
  zone_focus_ids uuid[] not null default array[]::uuid[],

  -- Budget envelope
  price_range_min numeric(14,2),
  price_range_max numeric(14,2),
  price_range_currency char(3) references public.currencies(code),

  country_code char(2) not null references public.countries(code),

  -- Raw psychometric scores (excepción D7 jsonb justificada: snapshot transient pre-normalize a traits)
  disc_profile jsonb not null default '{}'::jsonb,
  big_five_profile jsonb not null default '{}'::jsonb,

  -- Behavioral embedding (D10): all-MiniLM-L6-v2 dim 384
  behavioral_embedding vector(384),
  embedding_updated_at timestamptz,

  -- Heartbeat denormalizado de behavioral_signals
  last_signal_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint buyer_twins_price_range_valid check (
    price_range_min is null or price_range_max is null or price_range_max >= price_range_min
  ),
  constraint buyer_twins_price_range_currency_required check (
    (price_range_min is null and price_range_max is null) or price_range_currency is not null
  ),
  constraint buyer_twins_country_code_supported check (
    country_code in ('MX', 'CO', 'AR', 'BR', 'US')
  ),
  constraint buyer_twins_currency_code_supported check (
    price_range_currency is null or price_range_currency in ('MXN', 'COP', 'ARS', 'BRL', 'USD')
  )
);

create index idx_buyer_twins_user on public.buyer_twins (user_id) where user_id is not null;
create index idx_buyer_twins_persona on public.buyer_twins (persona_type_id);
create index idx_buyer_twins_country on public.buyer_twins (country_code);
create index idx_buyer_twins_last_signal on public.buyer_twins (last_signal_at desc nulls last);
create index idx_buyer_twins_zone_focus on public.buyer_twins using gin (zone_focus_ids);
create index idx_buyer_twins_embedding
  on public.buyer_twins
  using ivfflat (behavioral_embedding vector_cosine_ops)
  with (lists = 100)
  where behavioral_embedding is not null;

create trigger trg_buyer_twins_updated_at
  before update on public.buyer_twins
  for each row execute function public.set_updated_at();

alter table public.buyer_twins enable row level security;
-- RLS policies en crm_009.

comment on table public.buyer_twins is
  'Gemelo digital comprador. user_id NULL permite anonymous twins (ADR-021 PPD Capa 1). disc/big_five jsonb transient pre-normalize a buyer_twin_traits.';

comment on column public.buyer_twins.behavioral_embedding is
  'pgvector(384) all-MiniLM-L6-v2. Recomputado via SECDEF recompute_buyer_twin_embedding (STUB FASE 13.B.7).';

-- ============================================================
-- Add FK family_units.primary_buyer_twin_id → buyer_twins.id (ahora que buyer_twins existe)
-- ============================================================
alter table public.family_units
  add constraint family_units_primary_buyer_twin_fk
  foreign key (primary_buyer_twin_id) references public.buyer_twins(id) on delete restrict;

alter table public.family_unit_members
  add constraint family_unit_members_buyer_twin_fk
  foreign key (buyer_twin_id) references public.buyer_twins(id) on delete cascade;

-- ============================================================
-- buyer_twin_traits — normalizado DISC + Big Five (D7)
-- ============================================================
create table public.buyer_twin_traits (
  id uuid primary key default gen_random_uuid(),
  buyer_twin_id uuid not null references public.buyer_twins(id) on delete cascade,
  trait_system text not null,
  trait_code text not null,
  trait_value numeric(5,2) not null,
  confidence numeric(4,3) not null default 0.500,
  computed_at timestamptz not null default now(),

  constraint buyer_twin_traits_unique unique (buyer_twin_id, trait_system, trait_code),
  constraint buyer_twin_traits_system_check check (trait_system in ('disc', 'big_five')),
  constraint buyer_twin_traits_value_range check (trait_value >= 0 and trait_value <= 100),
  constraint buyer_twin_traits_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint buyer_twin_traits_code_valid check (
    (trait_system = 'disc'     and trait_code in ('D','I','S','C')) or
    (trait_system = 'big_five' and trait_code in ('O','C','E','A','N'))
  )
);

create index idx_buyer_twin_traits_lookup on public.buyer_twin_traits (buyer_twin_id, trait_system);
create index idx_buyer_twin_traits_recent on public.buyer_twin_traits (computed_at desc);

alter table public.buyer_twin_traits enable row level security;

comment on table public.buyer_twin_traits is
  'Normalizado DISC (D/I/S/C) + Big Five (O/C/E/A/N). UNIQUE(twin, system, code). 0-100 continuous (Gate-4 hybrid). confidence orthogonal al value (ADR-021).';
