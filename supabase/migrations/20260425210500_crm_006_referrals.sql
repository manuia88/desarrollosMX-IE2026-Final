-- FASE 07.7.A.4 — CRM Foundation: referrals (polymorphic) + referral_rewards
-- ADR-034 (Gate-2 founder OK 2026-04-25) + ADR-030 zones polymorphic precedent.
-- Polymorphic FK enforcement vía trigger BEFORE INSERT/UPDATE (no DDL FK).

create table public.referrals (
  id uuid primary key default gen_random_uuid(),

  -- Polymorphic source (user|developer|deal)
  source_type text not null check (source_type in ('user', 'developer', 'deal')),
  source_id   uuid not null,

  -- Polymorphic target (user|deal|operacion)
  target_type text not null check (target_type in ('user', 'deal', 'operacion')),
  target_id   uuid not null,

  persona_type_id uuid references public.persona_types(id) on delete restrict,

  status text not null default 'pending'
    check (status in ('pending', 'attributed', 'paid', 'expired', 'rejected')),

  -- attribution_chain: [{hop:int, referrer_id:uuid, timestamp:timestamptz, weight:numeric}]
  -- Excepción D7 jsonb justificada: chain dinámica multi-hop variable.
  attribution_chain jsonb not null default '[]'::jsonb,

  reward_amount numeric(14,2),
  reward_currency char(3) references public.currencies(code),

  country_code char(2) not null references public.countries(code),

  expires_at timestamptz,
  attributed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint referrals_country_supported check (country_code in ('MX','CO','AR','BR','US')),
  constraint referrals_currency_supported check (
    reward_currency is null or reward_currency in ('MXN','COP','ARS','BRL','USD')
  ),
  -- Block self-referral
  constraint referrals_no_self_referral check (
    not (source_type = target_type and source_id = target_id)
  )
);

create index idx_referrals_source on public.referrals (source_type, source_id);
create index idx_referrals_target on public.referrals (target_type, target_id);
create index idx_referrals_status on public.referrals (status);
create index idx_referrals_country on public.referrals (country_code);
create index idx_referrals_expires on public.referrals (expires_at) where expires_at is not null;
create index idx_referrals_persona on public.referrals (persona_type_id) where persona_type_id is not null;
create index idx_referrals_created on public.referrals (created_at desc);

create trigger trg_referrals_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;

comment on table public.referrals is
  'Polymorphic referrals (ADR-034). source_type/target_type CHECK-based. attribution_chain jsonb justified (chain variable multi-hop). FK polimórfico via trigger BEFORE INSERT/UPDATE.';

-- ============================================================
-- Polymorphic FK validator — SECDEF + auth.uid() guard
-- ============================================================
create or replace function public.fn_validate_referral_polymorphic_fks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_exists boolean;
  v_target_exists boolean;
begin
  if auth.uid() is null and not public.is_superadmin() then
    raise exception 'Unauthorized — cannot insert referrals as anon';
  end if;

  case new.source_type
    when 'user'      then select exists(select 1 from public.profiles where id = new.source_id) into v_source_exists;
    when 'developer' then select exists(select 1 from public.desarrolladoras where id = new.source_id) into v_source_exists;
    when 'deal'      then select exists(select 1 from public.deals where id = new.source_id) into v_source_exists;
  end case;

  if not v_source_exists then
    raise exception 'referrals.source_id (%) of type % does not exist', new.source_id, new.source_type;
  end if;

  case new.target_type
    when 'user'      then select exists(select 1 from public.profiles where id = new.target_id) into v_target_exists;
    when 'deal'      then select exists(select 1 from public.deals where id = new.target_id) into v_target_exists;
    when 'operacion' then select exists(select 1 from public.operaciones where id = new.target_id) into v_target_exists;
  end case;

  if not v_target_exists then
    raise exception 'referrals.target_id (%) of type % does not exist', new.target_id, new.target_type;
  end if;

  return new;
end;
$$;

comment on function public.fn_validate_referral_polymorphic_fks() is
  'Trigger BEFORE INSERT/UPDATE referrals — valida polymorphic source/target existence. SECDEF + search_path="" + auth.uid() guard (ADR-009 D3 + ADR-030 pattern).';

create trigger trg_referrals_validate_polymorphic_fks
  before insert or update of source_type, source_id, target_type, target_id
  on public.referrals
  for each row execute function public.fn_validate_referral_polymorphic_fks();

-- ============================================================
-- resolve_polymorphic_referral_source utility (read-only)
-- ============================================================
create or replace function public.resolve_polymorphic_referral_source(
  s_type text,
  s_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  case s_type
    when 'user' then
      select jsonb_build_object(
        'type', 'user',
        'id', id,
        'label', full_name,
        'country_code', country_code
      ) into v_result
      from public.profiles where id = s_id;

    when 'developer' then
      select jsonb_build_object(
        'type', 'developer',
        'id', id,
        'label', razon_social,
        'country_code', country_code
      ) into v_result
      from public.desarrolladoras where id = s_id;

    when 'deal' then
      select jsonb_build_object(
        'type', 'deal',
        'id', id,
        'label', 'Deal #' || id::text,
        'country_code', country_code
      ) into v_result
      from public.deals where id = s_id;

    else
      raise exception 'Unsupported source_type: %', s_type;
  end case;

  return v_result;
end;
$$;

revoke execute on function public.resolve_polymorphic_referral_source(text, uuid) from public, anon;
grant execute on function public.resolve_polymorphic_referral_source(text, uuid) to authenticated, service_role;

comment on function public.resolve_polymorphic_referral_source(text, uuid) is
  'Utility resolver source info polymorphic referral. SECDEF + search_path="" + auth.uid() guard.';

-- ============================================================
-- referral_rewards — pagables vinculadas a operaciones
-- ============================================================
create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),

  referral_id uuid not null references public.referrals(id) on delete cascade,

  reward_type text not null
    check (reward_type in ('commission', 'credit', 'discount', 'gift_card')),

  amount numeric(14,2) not null check (amount > 0),
  amount_currency char(3) not null references public.currencies(code),

  -- ON DELETE SET NULL: si operacion se borra (improbable; legal hold), reward histórico preservado.
  operacion_id uuid references public.operaciones(id) on delete set null,

  paid_at timestamptz,
  payment_method text,
  payment_reference text,

  created_at timestamptz not null default now(),

  constraint referral_rewards_currency_supported check (amount_currency in ('MXN','COP','ARS','BRL','USD'))
);

create index idx_referral_rewards_referral on public.referral_rewards (referral_id);
create index idx_referral_rewards_type on public.referral_rewards (reward_type);
create index idx_referral_rewards_pending on public.referral_rewards (paid_at) where paid_at is null;
create index idx_referral_rewards_operacion on public.referral_rewards (operacion_id) where operacion_id is not null;

alter table public.referral_rewards enable row level security;

comment on table public.referral_rewards is
  'Pagos derivados de referrals atribuidos. payment_method text libre (extensibilidad fee providers). operacion_id ON DELETE SET NULL preserva histórico audit.';
