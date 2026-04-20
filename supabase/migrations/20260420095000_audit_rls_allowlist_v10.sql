-- audit_rls_allowlist v10 — FASE 09 SESIÓN 1/2.
-- Agrega comment intentional_public a las 2 policies score_weights (D8):
--   - score_weights_select_authenticated (dimension weights son descriptores
--     de producto público, lectura authenticated sin filtro)
--   - score_weights_service_all (policy FOR ALL TO service_role; qual=true
--     convención de bypass RLS natural, writer admin superadmin endpoint)

do $$
declare
  pol_name text;
  tbl_name text;
  pol_oid oid;
  rationale text;
begin
  for pol_name, tbl_name, rationale in
    select unnest(array[
      'score_weights_select_authenticated',
      'score_weights_service_all'
    ]),
    unnest(array[
      'score_weights',
      'score_weights'
    ]),
    unnest(array[
      'intentional_public: dimension weights N1 runtime son descriptores de producto público (catálogo 03.8 §Nivel 1 fórmulas) — authenticated lee sin filtro',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); writer admin endpoint POST /api/admin/scores/weights superadmin auth'
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

comment on function public.audit_rls_violations() is
  'v10 — FASE 09 SESIÓN 1/2: allowlist 2 policies score_weights (D8 runtime weights).';
