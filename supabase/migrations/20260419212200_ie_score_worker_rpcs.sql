-- RPC para el worker /api/cron/score-worker: claim atómico de jobs pending
-- con FOR UPDATE SKIP LOCKED (concurrencia segura) + finalize con backoff.
-- FASE 08 / BLOQUE 8.A / MÓDULO 8.A.4
-- Refs: docs/02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md §8.A.4.2/4.3

-- ============================================================
-- claim_pending_score_jobs: worker claim atómico.
-- Reclama hasta p_limit jobs pending (scheduled_for <= now()),
-- ORDER BY priority ASC, scheduled_for ASC, con FOR UPDATE SKIP LOCKED.
-- Los marca 'processing' + started_at=now() antes de retornar — previene
-- doble processing bajo workers concurrentes.
-- ============================================================
create or replace function public.claim_pending_score_jobs(p_limit int default 50)
returns table (
  id uuid,
  score_id text,
  entity_type text,
  entity_id uuid,
  country_code char(2),
  triggered_by text,
  priority int,
  batch_mode boolean,
  attempts int,
  scheduled_for timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select q.id
    from public.score_recalculation_queue q
    where q.status = 'pending'
      and q.scheduled_for <= now()
    order by q.priority asc, q.scheduled_for asc
    limit p_limit
    for update skip locked
  )
  update public.score_recalculation_queue q
     set status = 'processing',
         started_at = now()
    from claimed
   where q.id = claimed.id
  returning q.id, q.score_id, q.entity_type, q.entity_id, q.country_code,
            q.triggered_by, q.priority, q.batch_mode, q.attempts, q.scheduled_for;
end;
$$;

grant execute on function public.claim_pending_score_jobs to service_role;

comment on function public.claim_pending_score_jobs is
  'Worker-side claim: reserva jobs pending con FOR UPDATE SKIP LOCKED. '
  'Marca status=processing antes de retornar. Seguro bajo N workers concurrentes.';

-- ============================================================
-- finalize_score_job: worker finaliza ejecución con éxito/error + backoff.
-- Backoff 1m / 5m / 15m según attempts (plan 8.A.4.3).
-- Tras attempts ≥ 4 marca 'error' terminal (sin reprogramar).
-- ============================================================
create or replace function public.finalize_score_job(
  p_id uuid,
  p_success boolean,
  p_error text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
  v_next_delay interval;
  v_final boolean := false;
  v_new_status text;
begin
  select attempts into v_attempts
    from public.score_recalculation_queue
   where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_success then
    update public.score_recalculation_queue
       set status = 'done',
           finished_at = now(),
           error = null
     where id = p_id;
    return jsonb_build_object('ok', true, 'final', true, 'status', 'done');
  end if;

  v_attempts := v_attempts + 1;

  if v_attempts >= 4 then
    v_new_status := 'error';
    v_final := true;
    update public.score_recalculation_queue
       set status = v_new_status,
           attempts = v_attempts,
           finished_at = now(),
           error = p_error
     where id = p_id;
  else
    v_next_delay := case v_attempts
      when 1 then interval '1 minute'
      when 2 then interval '5 minutes'
      else interval '15 minutes'
    end;
    v_new_status := 'pending';
    update public.score_recalculation_queue
       set status = v_new_status,
           attempts = v_attempts,
           scheduled_for = now() + v_next_delay,
           started_at = null,
           error = p_error
     where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'final', v_final,
    'status', v_new_status,
    'attempts', v_attempts
  );
end;
$$;

grant execute on function public.finalize_score_job to service_role;

comment on function public.finalize_score_job is
  'Finaliza job IE: success → done terminal; error → reprograma con '
  'backoff 1m/5m/15m por attempts. Después de 4 intentos marca error.';

-- ============================================================
-- queue_metrics_summary: consumido por /api/admin/queue-metrics.
-- Retorna counts pending_by_priority + last_run_ts + avg_duration_ms
-- + partitions_score_history.
-- ============================================================
create or replace function public.queue_metrics_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending jsonb;
  v_last_run_ts timestamptz;
  v_avg_duration_ms numeric;
  v_partitions_count int;
begin
  -- pending_by_priority como mapa {"1": N1, "2": N2, ...}
  select jsonb_object_agg(priority::text, cnt) into v_pending
    from (
      select priority, count(*) as cnt
        from public.score_recalculation_queue
       where status = 'pending'
       group by priority
    ) p;

  -- timestamp del último tick done (aprox).
  select max(finished_at) into v_last_run_ts
    from public.score_recalculation_queue
   where status in ('done', 'error');

  -- avg duration (ms) sobre últimos 100 jobs done.
  select avg(extract(epoch from (finished_at - started_at)) * 1000)
    into v_avg_duration_ms
    from (
      select finished_at, started_at
        from public.score_recalculation_queue
       where status = 'done' and started_at is not null and finished_at is not null
       order by finished_at desc
       limit 100
    ) sub;

  -- # partitions de score_history.
  select count(*) into v_partitions_count
    from public.show_partitions('public.score_history');

  return jsonb_build_object(
    'pending_by_priority', coalesce(v_pending, '{}'::jsonb),
    'last_run_ts', v_last_run_ts,
    'avg_duration_ms', coalesce(v_avg_duration_ms, 0),
    'partitions_score_history', v_partitions_count
  );
end;
$$;

grant execute on function public.queue_metrics_summary to service_role;

comment on function public.queue_metrics_summary is
  'Snapshot del estado del worker IE. Consumido por /api/admin/queue-metrics '
  '(restringido a is_superadmin). Solo lectura.';
