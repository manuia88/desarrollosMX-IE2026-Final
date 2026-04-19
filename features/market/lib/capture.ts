// Inserta captura de Chrome Extension en market_prices_secondary vía RPC server-side.
// La RPC `record_extension_capture` hace insert + audit_log atómicos (ADR-018 R7).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/shared/types/database';
import { type MarketCapture, normalizeCapture } from '../schemas/capture';

export interface CaptureContext {
  supabase: SupabaseClient<Database>;
  profileId: string;
  countryCode: string;
}

export interface CaptureRecord {
  marketPriceRowId: number;
  source: string;
  listingId: string;
}

export interface CaptureError {
  ok: false;
  code: 'rpc_error' | 'invalid_payload';
  message: string;
}

export type CaptureResult = ({ ok: true } & CaptureRecord) | CaptureError;

export async function persistCapture(
  ctx: CaptureContext,
  payload: MarketCapture,
): Promise<CaptureResult> {
  const normalized = normalizeCapture(payload);

  const args: {
    p_profile_id: string;
    p_country_code: string;
    p_source: string;
    p_listing_id: string;
    p_property_type: string;
    p_operation: string;
    p_price_minor: number;
    p_currency: string;
    p_address_raw: string;
    p_raw_html_hash: string;
    p_posted_at: string;
    p_seller_type: string;
    p_amenities: Json;
    p_meta: Json;
    p_area_built_m2?: number;
    p_bedrooms?: number;
    p_bathrooms?: number;
    p_parking?: number;
  } = {
    p_profile_id: ctx.profileId,
    p_country_code: ctx.countryCode,
    p_source: normalized.source,
    p_listing_id: normalized.listing_id,
    p_property_type: normalized.property_type,
    p_operation: normalized.operation,
    p_price_minor: Number(normalized.price_minor),
    p_currency: normalized.currency,
    p_address_raw: normalized.address_raw,
    p_raw_html_hash: normalized.raw_html_hash,
    p_posted_at: normalized.posted_at,
    p_seller_type: normalized.seller_type,
    p_amenities: normalized.amenities as unknown as Json,
    p_meta: normalized.meta as unknown as Json,
  };
  if (normalized.area_built_m2 !== null) args.p_area_built_m2 = normalized.area_built_m2;
  if (normalized.bedrooms !== null) args.p_bedrooms = normalized.bedrooms;
  if (normalized.bathrooms !== null) args.p_bathrooms = normalized.bathrooms;
  if (normalized.parking !== null) args.p_parking = normalized.parking;

  const { data, error } = await ctx.supabase.rpc('record_extension_capture', args);

  if (error) {
    return { ok: false, code: 'rpc_error', message: error.message };
  }
  if (typeof data !== 'number') {
    return { ok: false, code: 'rpc_error', message: 'unexpected_rpc_payload' };
  }
  return {
    ok: true,
    marketPriceRowId: data,
    source: normalized.source,
    listingId: normalized.listing_id,
  };
}

export async function verifyExtensionToken(
  supabase: SupabaseClient<Database>,
  rawToken: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('verify_extension_api_key', {
    p_raw_key: rawToken,
  });
  if (error || !data) return null;
  return typeof data === 'string' ? data : null;
}
