-- Reorder + add DEFAULT NULL en params opcionales para que supabase type generator
-- emita los args como optional en el TS Args type. La función original 90000 fue
-- aplicada con todos los params NOT NULL — drop + recreate con la nueva signature.
--
-- FASE 07 / BLOQUE 7.E.4 (fix tipos generados)

drop function if exists public.record_extension_capture(
  uuid, char, text, text, text, text, bigint, char,
  numeric, smallint, numeric, smallint, text, jsonb, text, text, jsonb, date
);

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
