-- Extension capture: RPC para verificar tokens emitidos vía /extension/connect
-- y RPC para insertar listings capturados con auditoría.
--
-- FASE 07 / BLOQUE 7.E.4
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md §270 (rate limit 500/h/user)
--   ADR-009 D8 (api_keys con bcrypt) — extension reutiliza esta tabla con scope 'extension:capture'.

-- ============================================================
-- verify_extension_api_key — wrapper sobre verify_api_key + scope check.
-- Devuelve profile_id si token válido + scope contiene 'extension:capture'.
-- ============================================================
create or replace function public.verify_extension_api_key(p_raw_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_api_key_id uuid;
  v_profile_id uuid;
  v_scopes text[];
begin
  v_api_key_id := public.verify_api_key(p_raw_key);
  if v_api_key_id is null then
    return null;
  end if;

  select profile_id, scopes
    into v_profile_id, v_scopes
  from public.api_keys
  where id = v_api_key_id
  limit 1;

  if v_profile_id is null then
    return null;
  end if;
  if not ('extension:capture' = any(coalesce(v_scopes, '{}'::text[]))) then
    return null;
  end if;
  return v_profile_id;
end;
$$;

revoke execute on function public.verify_extension_api_key(text) from public, anon, authenticated;
grant execute on function public.verify_extension_api_key(text) to service_role;

comment on function public.verify_extension_api_key(text) is
  'Verifica token bearer de Chrome Extension. Returns profile_id si válido + scope extension:capture. ADR-012.';

-- ============================================================
-- issue_extension_token — wrapper sobre issue_api_key con scope fijo.
-- Caller debe ser authenticated (usa auth.uid() vía issue_api_key).
-- ============================================================
create or replace function public.issue_extension_token(p_label text default 'Chrome Extension')
returns table (api_key_id uuid, raw_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
begin
  if auth.uid() is null then
    raise exception 'issue_extension_token: unauthorized';
  end if;
  -- 90 días de vigencia (asesor regenera si expira)
  for v_result in
    select * from public.issue_api_key(
      p_label,
      array['extension:capture'],
      now() + interval '90 days'
    )
  loop
    api_key_id := v_result.api_key_id;
    raw_key := v_result.raw_key;
    return next;
  end loop;
end;
$$;

revoke execute on function public.issue_extension_token(text) from public, anon;
grant execute on function public.issue_extension_token(text) to authenticated, service_role;

comment on function public.issue_extension_token(text) is
  'Emite token Chrome Extension para auth.uid(). Scope extension:capture. Expira 90 días. ADR-012.';

-- ============================================================
-- record_extension_capture — INSERT atómico en market_prices_secondary
-- + audit_log. Llamado desde route handler /api/market/capture (service_role).
-- ============================================================
create or replace function public.record_extension_capture(
  p_profile_id uuid,
  p_country_code char(2),
  p_source text,
  p_listing_id text,
  p_property_type text,
  p_operation text,
  p_price_minor bigint,
  p_currency char(3),
  p_address_raw text,
  p_raw_html_hash text,
  p_posted_at date,
  p_area_built_m2 numeric default null,
  p_bedrooms smallint default null,
  p_bathrooms numeric default null,
  p_parking smallint default null,
  p_amenities jsonb default '[]'::jsonb,
  p_seller_type text default 'desconocido',
  p_meta jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_id bigint;
begin
  insert into public.market_prices_secondary (
    country_code, source, listing_id,
    property_type, operation, price_minor, currency,
    area_built_m2, bedrooms, bathrooms, parking,
    amenities, address_raw,
    seller_type, raw_html_hash,
    captured_via, captured_by_user_id,
    posted_at, meta
  ) values (
    p_country_code, p_source, p_listing_id,
    p_property_type, p_operation, p_price_minor, p_currency,
    p_area_built_m2, p_bedrooms, p_bathrooms, p_parking,
    coalesce(p_amenities, '[]'::jsonb), p_address_raw,
    p_seller_type, p_raw_html_hash,
    'chrome_extension', p_profile_id,
    p_posted_at, coalesce(p_meta, '{}'::jsonb)
  )
  on conflict (source, listing_id, posted_at) do update
    set
      price_minor = excluded.price_minor,
      currency = excluded.currency,
      area_built_m2 = excluded.area_built_m2,
      bedrooms = excluded.bedrooms,
      bathrooms = excluded.bathrooms,
      parking = excluded.parking,
      amenities = excluded.amenities,
      address_raw = excluded.address_raw,
      seller_type = excluded.seller_type,
      raw_html_hash = excluded.raw_html_hash,
      fetched_at = now(),
      meta = excluded.meta
  returning id into v_row_id;

  insert into public.audit_log (
    country_code, actor_id, action, table_name, meta
  ) values (
    p_country_code,
    p_profile_id,
    'market_capture.chrome_extension',
    'market_prices_secondary',
    jsonb_build_object(
      'row_id', v_row_id,
      'source', p_source,
      'listing_id', p_listing_id,
      'price_minor', p_price_minor,
      'currency', p_currency,
      'posted_at', p_posted_at
    )
  );
  return v_row_id;
end;
$$;

revoke execute on function public.record_extension_capture(
  uuid, char, text, text, text, text, bigint, char,
  text, text, date, numeric, smallint, numeric, smallint, jsonb, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_extension_capture(
  uuid, char, text, text, text, text, bigint, char,
  text, text, date, numeric, smallint, numeric, smallint, jsonb, text, jsonb
) to service_role;

comment on function public.record_extension_capture is
  'INSERT atómico market_prices_secondary + audit_log. Llamado desde /api/market/capture con service_role. ADR-012 + ADR-018 R7.';
