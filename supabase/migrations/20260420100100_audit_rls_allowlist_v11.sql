-- audit_rls_allowlist v11 — FASE 10 SESIÓN 1/3 infra N2.
-- Agrega allowlist para:
--   1) 5 policies `using (true)` / service_role all nuevas:
--        - score_comparison_matrix_select_authenticated
--        - score_comparison_matrix_service_all
--        - score_change_webhooks_service_all
--        - score_change_deliveries_service_all
--   2) función SECDEF trigger emitter:
--        - fn_emit_score_change_webhook (invocado solo desde trigger BD)

-- ============================================================
-- 1) COMMENT ON POLICY → marker intentional_public.
-- ============================================================
do $$
declare
  pol_name text;
  tbl_name text;
  pol_oid oid;
  rationale text;
begin
  for pol_name, tbl_name, rationale in
    select unnest(array[
      'score_comparison_matrix_select_authenticated',
      'score_comparison_matrix_service_all',
      'score_change_webhooks_service_all',
      'score_change_deliveries_service_all'
    ]),
    unnest(array[
      'score_comparison_matrix',
      'score_comparison_matrix',
      'score_change_webhooks',
      'score_change_deliveries'
    ]),
    unnest(array[
      'intentional_public: matriz comparación scores es descriptor público (A08 Comparador Multi-D). Authenticated lee sin filtro; datos derivados de zone_scores ya públicos.',
      'intentional_public: policy FOR ALL TO service_role — writer cron rebuild comparison matrix (scripts/score-comparison-matrix-rebuild.mjs).',
      'intentional_public: policy FOR ALL TO service_role — admin endpoint manage subscriptions + writer worker deliveries.',
      'intentional_public: policy FOR ALL TO service_role — writer trigger emitter + worker entregas con retry.'
    ])
  loop
    select pol.oid into pol_oid
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = tbl_name and pol.polname = pol_name;

    if pol_oid is not null then
      execute format('comment on policy %I on public.%I is %L',
        pol_name, tbl_name, rationale);
    end if;
  end loop;
end
$$;

-- ============================================================
-- 2) COMMENT ON FUNCTION SECDEF con marker intentional_secdef.
-- ============================================================
do $$
declare
  fn_name text;
  rationale text;
begin
  for fn_name, rationale in
    select unnest(array[
      'fn_emit_score_change_webhook'
    ]),
    unnest(array[
      'intentional_secdef: trigger body AFTER UPDATE zone_scores; lee webhooks + encola deliveries. No entry point externo, invocado solo por BD.'
    ])
  loop
    execute format(
      'comment on function public.%I is %L',
      fn_name,
      rationale
    );
  end loop;
end
$$;

comment on function public.audit_rls_violations() is
  'v11 — FASE 10 SESIÓN 1/3: allowlist 4 policies nuevas (score_comparison_matrix + score_change_webhooks + score_change_deliveries) + 1 SECDEF trigger (fn_emit_score_change_webhook).';
