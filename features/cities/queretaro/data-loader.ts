// ADR-059 — Querétaro city expansion (FASE 14.1) — Paso 1: data-loader zonas.
// UPSERT zonas key Querétaro a tabla zones master polymorphic.
// country_code='MX', scope_type='zona', parent_scope_id='queretaro'.
// NO migrations — reuse zones existente.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/shared/types/database';
import type { QroZoneCanon, QroZoneScopeId } from './types';

export const QRO_PARENT_SCOPE_ID = 'queretaro' as const;
export const QRO_COUNTRY_CODE = 'MX' as const;
export const QRO_SCOPE_TYPE = 'zona' as const;

export const QRO_ZONES_CANON: ReadonlyArray<QroZoneCanon> = [
  {
    scopeId: 'mx-queretaro-centro-historico',
    nameEs: 'Centro Histórico',
    nameEn: 'Historic Downtown',
    lat: 20.5888,
    lng: -100.3899,
  },
  {
    scopeId: 'mx-queretaro-juriquilla',
    nameEs: 'Juriquilla',
    nameEn: 'Juriquilla',
    lat: 20.7042,
    lng: -100.4404,
  },
  {
    scopeId: 'mx-queretaro-el-refugio',
    nameEs: 'El Refugio',
    nameEn: 'El Refugio',
    lat: 20.628,
    lng: -100.35,
  },
  {
    scopeId: 'mx-queretaro-cumbres-del-lago',
    nameEs: 'Cumbres del Lago',
    nameEn: 'Cumbres del Lago',
    lat: 20.71,
    lng: -100.45,
  },
  {
    scopeId: 'mx-queretaro-real-de-juriquilla',
    nameEs: 'Real de Juriquilla',
    nameEn: 'Real de Juriquilla',
    lat: 20.715,
    lng: -100.435,
  },
  {
    scopeId: 'mx-queretaro-milenio-iii',
    nameEs: 'Milenio III',
    nameEn: 'Milenio III',
    lat: 20.65,
    lng: -100.41,
  },
  {
    scopeId: 'mx-queretaro-antigua-hacienda',
    nameEs: 'Antigua Hacienda',
    nameEn: 'Antigua Hacienda',
    lat: 20.62,
    lng: -100.37,
  },
];

export interface LoadQueretaroZonesResult {
  readonly upserted: number;
  readonly errors: ReadonlyArray<string>;
}

export async function loadQueretaroZones(
  supabase: SupabaseClient<Database>,
): Promise<LoadQueretaroZonesResult> {
  const errors: string[] = [];

  const rows = QRO_ZONES_CANON.map((z) => ({
    country_code: QRO_COUNTRY_CODE,
    scope_type: QRO_SCOPE_TYPE,
    scope_id: z.scopeId,
    parent_scope_id: QRO_PARENT_SCOPE_ID,
    name_es: z.nameEs,
    name_en: z.nameEn,
    lat: z.lat,
    lng: z.lng,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_queretaro',
      adr: 'ADR-059',
    } satisfies Record<string, unknown> as Json,
  }));

  const { error, count } = await supabase.from('zones').upsert(rows, {
    onConflict: 'country_code,scope_type,scope_id',
    count: 'exact',
  });

  if (error) {
    errors.push(`[queretaro/data-loader] upsert failed: ${error.message}`);
    return { upserted: 0, errors };
  }

  return {
    upserted: count ?? rows.length,
    errors,
  };
}

export function isQroZoneScopeId(value: string): value is QroZoneScopeId {
  return QRO_ZONES_CANON.some((z) => z.scopeId === value);
}
