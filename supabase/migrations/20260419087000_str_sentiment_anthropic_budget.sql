-- FASE 07b / BLOQUE 7b.D — NLP Sentiment + ZIS infrastructure.
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.D
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018 (Constitutional AI GC-7)
--
-- Esta migration NO crea tablas nuevas para sentiment (str_reviews ya tiene
-- sentiment_score / sentiment_confidence / sentiment_source_span / topics
-- definidos en 20260419080000_str_schema_base.sql). Tampoco crea zone_scores
-- (FASE 08): ZIS calculator es puro + tRPC on-demand siguiendo el patrón
-- 7b.A baseline.
--
-- Sí crea:
--   1. Seed api_budgets.anthropic cap $100 USD/mes prod (alert 80%).
--      Dev cap $20 documentado en plan §7b.D consequences; aplicado vía
--      SAMPLER en sentiment worker (no via DB).
--   2. Función SQL aggregate_zone_sentiment(market_id, lookback_days) con
--      decaimiento exponencial 90d (recency-weighted).
--   3. Función monthly_anthropic_spend() para dashboard admin.

insert into public.api_budgets (
  source,
  monthly_budget_usd,
  alert_threshold_pct,
  hard_limit_pct,
  meta
)
values (
  'anthropic',
  100.00,
  80,
  100,
  jsonb_build_object(
    'authority_ref', 'FASE 07b §7b.D consequences',
    'provider', 'Anthropic',
    'billing_model', 'token_metered',
    'dev_cap_usd', 20.00,
    'models_in_scope', jsonb_build_array(
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'claude-opus-4-7'
    )
  )
)
on conflict (source) do update set
  monthly_budget_usd = excluded.monthly_budget_usd,
  alert_threshold_pct = excluded.alert_threshold_pct,
  hard_limit_pct = excluded.hard_limit_pct,
  meta = public.api_budgets.meta || excluded.meta;

create or replace function public.aggregate_zone_sentiment(
  p_market_id uuid,
  p_lookback_days integer default 365,
  p_decay_half_life_days integer default 90
)
returns table (
  market_id uuid,
  reviews_analyzed bigint,
  sentiment_weighted_avg numeric,
  sentiment_simple_avg numeric,
  positive_share numeric,
  negative_share numeric,
  topic_counts jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with reviews_in_scope as (
    select r.sentiment_score, r.posted_at, r.topics
    from public.str_reviews r
    join public.str_listings l
      on l.platform = r.platform and l.listing_id = r.listing_id
    where l.market_id = p_market_id
      and r.posted_at >= current_date - (p_lookback_days || ' days')::interval
      and r.sentiment_score is not null
  ),
  weighted as (
    select
      sentiment_score,
      posted_at,
      topics,
      exp(
        -ln(2)
        * extract(day from (current_date - posted_at))
        / nullif(p_decay_half_life_days, 0)
      ) as weight
    from reviews_in_scope
  ),
  topic_unnest as (
    select jsonb_array_elements_text(topics) as topic
    from reviews_in_scope
    where jsonb_typeof(topics) = 'array'
  )
  select
    p_market_id as market_id,
    (select count(*) from reviews_in_scope)::bigint as reviews_analyzed,
    (
      select
        case when sum(weight) > 0
          then round((sum(sentiment_score * weight) / sum(weight))::numeric, 4)
          else null
        end
      from weighted
    ) as sentiment_weighted_avg,
    (
      select round(avg(sentiment_score)::numeric, 4)
      from reviews_in_scope
    ) as sentiment_simple_avg,
    (
      select
        case when count(*) > 0
          then round(
            (count(*) filter (where sentiment_score > 0.2))::numeric / count(*)::numeric,
            4
          )
          else null
        end
      from reviews_in_scope
    ) as positive_share,
    (
      select
        case when count(*) > 0
          then round(
            (count(*) filter (where sentiment_score < -0.2))::numeric / count(*)::numeric,
            4
          )
          else null
        end
      from reviews_in_scope
    ) as negative_share,
    coalesce(
      (
        select jsonb_object_agg(topic, cnt)
        from (
          select topic, count(*)::int as cnt
          from topic_unnest
          group by topic
          order by count(*) desc
          limit 25
        ) t
      ),
      '{}'::jsonb
    ) as topic_counts;
$$;

comment on function public.aggregate_zone_sentiment(uuid, integer, integer) is
  'Sentiment agregado por market_id con decaimiento exponencial (default 90d half-life). '
  'Feed primario para ZIS composite y nomad-flow downstream. SECURITY INVOKER respeta RLS '
  'sobre str_reviews.';

create or replace function public.monthly_anthropic_spend(
  p_month date default date_trunc('month', now())::date
)
returns table (
  month date,
  spent_usd numeric,
  budget_usd numeric,
  pct numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p_month as month,
    coalesce(b.spent_mtd_usd, 0) as spent_usd,
    coalesce(b.monthly_budget_usd, 0) as budget_usd,
    case when b.monthly_budget_usd > 0
      then round((b.spent_mtd_usd / b.monthly_budget_usd) * 100, 2)
      else 0
    end as pct
  from public.api_budgets b
  where b.source = 'anthropic';
$$;

comment on function public.monthly_anthropic_spend(date) is
  'Resumen mensual del consumo Anthropic (cap $100/mo prod, $20/mo dev sampler-enforced).';
