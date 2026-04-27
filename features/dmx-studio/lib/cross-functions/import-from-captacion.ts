// FASE 14.F.4 Sprint 3 — Cross-function 3 (UPGRADE 8 LATERAL):
// Import desde captación M05 → pre-rellena Studio project draft.
//
// Flujo: asesor abre captación → click "Generar Studio video" →
// navega a /studio-app/projects/new?captacionId=<id> → este lib
// query captacion ownership-checked, retorna pre-fill data + URL portal
// (si captacion.notes contiene URL detectable). Cero campos extra requeridos
// — usa fields existentes (direccion, ciudad, colonia, precio_solicitado,
// currency, country_code, features) para construir prefilledData.
//
// NOTA: la tabla `captaciones` H1 NO tiene columna `url_portal_externo`.
// Caller H1 puede pasar URL manualmente vía URL Import (Sprint 3 parseListingUrl)
// si el captador conserva el link del portal. Cuando se agregue la columna en H2,
// extender extractUrl() con `select(...,url_portal_externo)`.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface ImportFromCaptacionPrefilledData {
  readonly title: string;
  readonly price: number | null;
  readonly currency: string;
  readonly areaM2: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly zone: string | null;
  readonly amenities: ReadonlyArray<string>;
  readonly countryCode: string;
}

export interface ImportFromCaptacionResult {
  readonly url: string | null;
  readonly prefilledData: ImportFromCaptacionPrefilledData;
  readonly captacionId: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/i;

function extractUrlFromNotes(notes: string | null): string | null {
  if (typeof notes !== 'string' || notes.length === 0) return null;
  const match = notes.match(URL_REGEX);
  return match ? match[0] : null;
}

interface CaptacionFeaturesShape {
  recamaras?: unknown;
  banos?: unknown;
  area_m2?: unknown;
  amenidades?: unknown;
}

function parseFeatures(raw: unknown): {
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  amenities: ReadonlyArray<string>;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { bedrooms: null, bathrooms: null, areaM2: null, amenities: [] };
  }
  const obj = raw as CaptacionFeaturesShape;
  const bedrooms = typeof obj.recamaras === 'number' ? obj.recamaras : null;
  const bathrooms = typeof obj.banos === 'number' ? obj.banos : null;
  const areaM2 = typeof obj.area_m2 === 'number' ? obj.area_m2 : null;
  const amenities = Array.isArray(obj.amenidades)
    ? obj.amenidades.filter((x): x is string => typeof x === 'string')
    : [];
  return { bedrooms, bathrooms, areaM2, amenities };
}

function buildTitle(direccion: string, colonia: string | null, ciudad: string | null): string {
  const parts: string[] = [];
  if (direccion.trim().length > 0) parts.push(direccion.trim());
  if (colonia && colonia.trim().length > 0) parts.push(colonia.trim());
  else if (ciudad && ciudad.trim().length > 0) parts.push(ciudad.trim());
  if (parts.length === 0) return 'Captación sin dirección';
  return parts.join(' · ').slice(0, 180);
}

export async function importFromCaptacion(
  supabase: AdminSupabase,
  captacionId: string,
  userId: string,
): Promise<ImportFromCaptacionResult> {
  const captResp = await supabase
    .from('captaciones')
    .select(
      'id, asesor_id, direccion, ciudad, colonia, precio_solicitado, currency, country_code, features, notes',
    )
    .eq('id', captacionId)
    .maybeSingle();

  if (captResp.error) {
    throw new Error(`importFromCaptacion query failed: ${captResp.error.message}`);
  }
  const captacion = captResp.data;
  if (!captacion) {
    throw new Error(`importFromCaptacion: captacion ${captacionId} not found`);
  }
  if (captacion.asesor_id !== userId) {
    throw new Error(
      `importFromCaptacion: captacion ${captacionId} not owned by user ${userId} (forbidden)`,
    );
  }

  const features = parseFeatures(captacion.features);
  const url = extractUrlFromNotes(captacion.notes);
  const zone = captacion.colonia ?? captacion.ciudad ?? null;
  const price =
    typeof captacion.precio_solicitado === 'number'
      ? captacion.precio_solicitado
      : Number(captacion.precio_solicitado);

  const prefilledData: ImportFromCaptacionPrefilledData = {
    title: buildTitle(captacion.direccion, captacion.colonia, captacion.ciudad),
    price: Number.isFinite(price) ? price : null,
    currency: captacion.currency,
    areaM2: features.areaM2,
    bedrooms: features.bedrooms,
    bathrooms: features.bathrooms,
    zone,
    amenities: features.amenities,
    countryCode: captacion.country_code,
  };

  return {
    url,
    prefilledData,
    captacionId: captacion.id,
  };
}
