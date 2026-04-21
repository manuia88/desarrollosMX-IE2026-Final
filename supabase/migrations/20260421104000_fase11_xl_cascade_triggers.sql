-- FASE 11 XL — BLOQUE 11.C.3 Cascade triggers para índices DMX.
-- Cuando un score consumido por un DMX-* cambia (UPDATE OF score_value),
-- enqueue recalc del DMX-* afectado. Alineado con dependencies declaradas
-- en shared/lib/intelligence-engine/registry.ts L1492-1694 (15 índices).
--
-- Índices zone: DMX-IPV, DMX-IAB, DMX-IDS, DMX-IRE, DMX-ICO, DMX-MOM,
--   DMX-LIV, DMX-FAM, DMX-YNG, DMX-GRN, DMX-STR, DMX-GNT, DMX-STA.
-- Índices project: DMX-INV, DMX-DEV (trigger aparte sobre project_scores).
--
-- DMX-ICO no tiene zone deps (depende de macro_series + market_prices);
-- ya se dispara via macro_updated existente, no se enqueue desde aquí.
--
-- Firma real de enqueue_score_recalc:
--   (p_score_id text, p_entity_type text, p_entity_id uuid, p_country text,
--    p_triggered_by text, p_priority int default 5, p_batch bool default false,
--    p_scheduled_for timestamptz default null)
-- El 8vo argumento es scheduled_for, no metadata. Pasamos null → now().

-- ============================================================
-- fn_enqueue_indices_for_zone — score_type → [DMX-* afectados]
-- ============================================================
create or replace function public.fn_enqueue_indices_for_zone(
  p_zone_id uuid,
  p_country_code char(2),
  p_changed_score_type text
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_indices text[];
  v_index text;
  v_enqueued int := 0;
  v_result jsonb;
begin
  if p_zone_id is null or p_changed_score_type is null then
    return 0;
  end if;

  v_indices := case p_changed_score_type
    -- Scores N0 consumidos por DMX-* (map derivado de registry L1492-1694).
    when 'F08' then array['DMX-IPV','DMX-IDS','DMX-LIV','DMX-YNG','DMX-STA']
    when 'F09' then array['DMX-IPV']
    when 'N11' then array['DMX-IPV','DMX-MOM']
    when 'A12' then array['DMX-IPV']
    when 'N01' then array['DMX-IPV','DMX-IDS','DMX-LIV']
    when 'H01' then array['DMX-IDS','DMX-LIV','DMX-GRN']
    when 'H02' then array['DMX-IDS','DMX-LIV']
    when 'N02' then array['DMX-IDS','DMX-LIV','DMX-FAM']
    when 'F01' then array['DMX-IDS','DMX-IRE','DMX-FAM','DMX-STR']
    when 'F02' then array['DMX-IDS','DMX-YNG']
    when 'H03' then array['DMX-IRE']
    when 'N07' then array['DMX-IRE','DMX-FAM','DMX-LIV']
    when 'F06' then array['DMX-IRE','DMX-GRN']
    when 'N05' then array['DMX-IRE','DMX-GRN']
    when 'N08' then array['DMX-LIV','DMX-FAM','DMX-YNG','DMX-GRN']
    when 'N10' then array['DMX-LIV','DMX-FAM','DMX-GRN']
    when 'N04' then array['DMX-LIV','DMX-YNG']
    when 'N03' then array['DMX-FAM']
    when 'F03' then array['DMX-YNG']
    when 'N09' then array['DMX-YNG','DMX-STR','DMX-GNT']
    when 'F04' then array['DMX-GRN']
    when 'B08' then array['DMX-IAB']
    -- Scores DMX-* consumidos por otros DMX-* (cascada intra-índices).
    when 'DMX-MOM' then array['DMX-GNT']
    when 'DMX-IRE' then array['DMX-STA']
    else array[]::text[]
  end;

  foreach v_index in array v_indices loop
    v_result := public.enqueue_score_recalc(
      v_index, 'zone', p_zone_id, p_country_code,
      'cascade:zone_scores_indices:' || p_changed_score_type,
      7, true, null
    );
    if (v_result ->> 'enqueued')::boolean then
      v_enqueued := v_enqueued + 1;
    end if;
  end loop;

  return v_enqueued;
end;
$$;

comment on function public.fn_enqueue_indices_for_zone is
  'FASE 11 XL — enqueue DMX-* índices afectados por cambio de score zone. '
  'Map score_type → [DMX-*] derivado de registry.ts dependencies L1492-1694. '
  'Priority 7 (más baja que N0 cascade=8) batch_mode true.';

grant execute on function public.fn_enqueue_indices_for_zone to service_role;

-- ============================================================
-- fn_trg_zone_scores_cascade_indices — AFTER UPDATE OF score_value
-- ============================================================
create or replace function public.fn_trg_zone_scores_cascade_indices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo recalcular si el valor cambió.
  if new.score_value is not distinct from old.score_value then
    return new;
  end if;
  perform public.fn_enqueue_indices_for_zone(
    new.zone_id, new.country_code, new.score_type
  );
  return new;
end;
$$;

drop trigger if exists trg_zone_scores_cascade_indices on public.zone_scores;
create trigger trg_zone_scores_cascade_indices
  after update of score_value on public.zone_scores
  for each row
  execute function public.fn_trg_zone_scores_cascade_indices();

comment on trigger trg_zone_scores_cascade_indices on public.zone_scores is
  'FASE 11 XL — AFTER UPDATE OF score_value. Row-level porque score_type varía '
  'por fila y necesitamos el tipo para mapear al DMX-* correspondiente.';

-- ============================================================
-- fn_trg_project_scores_cascade_indices — enqueue DMX-INV, DMX-DEV
-- ============================================================
create or replace function public.fn_trg_project_scores_cascade_indices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_indices text[];
  v_index text;
  v_result jsonb;
begin
  if new.score_value is not distinct from old.score_value then
    return new;
  end if;

  -- DMX-INV deps (project-side): H05.
  -- DMX-DEV deps: H05, H06, H07, H15, H08, H09.
  v_indices := case new.score_type
    when 'H05' then array['DMX-INV','DMX-DEV']
    when 'H06' then array['DMX-DEV']
    when 'H07' then array['DMX-DEV']
    when 'H08' then array['DMX-DEV']
    when 'H09' then array['DMX-DEV']
    when 'H15' then array['DMX-DEV']
    else array[]::text[]
  end;

  foreach v_index in array v_indices loop
    v_result := public.enqueue_score_recalc(
      v_index, 'project', new.project_id, new.country_code,
      'cascade:project_scores_indices:' || new.score_type,
      7, true, null
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_project_scores_cascade_indices on public.project_scores;
create trigger trg_project_scores_cascade_indices
  after update of score_value on public.project_scores
  for each row
  execute function public.fn_trg_project_scores_cascade_indices();

comment on trigger trg_project_scores_cascade_indices on public.project_scores is
  'FASE 11 XL — enqueue DMX-INV/DMX-DEV al cambiar scores H05/H06/H07/H08/H09/H15.';

grant execute on function public.fn_trg_zone_scores_cascade_indices() to service_role;
grant execute on function public.fn_trg_project_scores_cascade_indices() to service_role;
