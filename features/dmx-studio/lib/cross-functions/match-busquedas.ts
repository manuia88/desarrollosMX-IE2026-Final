// FASE 14.F.4 Sprint 3 — Cross-function 4 (UPGRADE 9 LATERAL):
// Post studio_video_projects.status = 'published' o 'rendered', buscar
// busquedas activas (M04) del mismo asesor cuyo criteria matchea la propiedad
// del project (zona + price range). Retorna lista de busqueda ids matched.
//
// Notification trigger STUB ADR-018 — Resend email a asesor con preview matches
// se activa L-NEW-STUDIO-MATCH-BUSQUEDAS-NOTIFY H2 (cuando Resend client + email
// templates Studio multi-format estén shipped). Mientras tanto: log estructurado.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface MatchingBusqueda {
  readonly id: string;
  readonly leadId: string;
  readonly status: string;
  readonly matchedReason: ReadonlyArray<string>;
}

export interface FindMatchingBusquedasResult {
  readonly matches: ReadonlyArray<MatchingBusqueda>;
  readonly count: number;
  readonly notificationStub: boolean;
}

interface ProjectSourceMetadata {
  zone?: unknown;
  price?: unknown;
  currency?: unknown;
}

interface BusquedaCriteria {
  zone_ids?: unknown;
  ciudades?: unknown;
  price_min?: unknown;
  price_max?: unknown;
  zone?: unknown;
}

function parseProjectMetadata(raw: Json | null): {
  zone: string | null;
  price: number | null;
  currency: string | null;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { zone: null, price: null, currency: null };
  }
  const obj = raw as ProjectSourceMetadata;
  const zone = typeof obj.zone === 'string' ? obj.zone : null;
  const price = typeof obj.price === 'number' ? obj.price : null;
  const currency = typeof obj.currency === 'string' ? obj.currency : null;
  return { zone, price, currency };
}

function parseCriteria(raw: Json): BusquedaCriteria {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as BusquedaCriteria;
}

function zoneMatches(projectZone: string | null, criteria: BusquedaCriteria): boolean {
  if (!projectZone) return false;
  const projectZoneLower = projectZone.trim().toLowerCase();
  if (projectZoneLower.length === 0) return false;
  const ciudades = Array.isArray(criteria.ciudades)
    ? criteria.ciudades.filter((c): c is string => typeof c === 'string')
    : [];
  const criterionZone = typeof criteria.zone === 'string' ? criteria.zone.toLowerCase() : null;
  if (criterionZone && criterionZone.length > 0 && projectZoneLower.includes(criterionZone)) {
    return true;
  }
  for (const c of ciudades) {
    if (projectZoneLower.includes(c.toLowerCase())) return true;
  }
  return false;
}

function priceMatches(projectPrice: number | null, criteria: BusquedaCriteria): boolean {
  if (projectPrice === null || !Number.isFinite(projectPrice)) return false;
  const min = typeof criteria.price_min === 'number' ? criteria.price_min : null;
  const max = typeof criteria.price_max === 'number' ? criteria.price_max : null;
  if (min !== null && projectPrice < min) return false;
  if (max !== null && projectPrice > max) return false;
  // At least one bound must exist for a match (avoid matching unconstrained busquedas).
  return min !== null || max !== null;
}

export async function findMatchingBusquedas(
  supabase: AdminSupabase,
  projectId: string,
): Promise<FindMatchingBusquedasResult> {
  const projResp = await supabase
    .from('studio_video_projects')
    .select('id, user_id, status, source_metadata')
    .eq('id', projectId)
    .maybeSingle();
  if (projResp.error) {
    throw new Error(`findMatchingBusquedas project query failed: ${projResp.error.message}`);
  }
  const project = projResp.data;
  if (!project) {
    throw new Error(`findMatchingBusquedas: project ${projectId} not found`);
  }

  const { zone: projectZone, price: projectPrice } = parseProjectMetadata(project.source_metadata);

  const busqResp = await supabase
    .from('busquedas')
    .select('id, lead_id, status, criteria')
    .eq('asesor_id', project.user_id)
    .eq('status', 'activa')
    .limit(100);
  if (busqResp.error) {
    throw new Error(`findMatchingBusquedas busquedas query failed: ${busqResp.error.message}`);
  }
  const busquedas = busqResp.data ?? [];

  const matches: MatchingBusqueda[] = [];
  for (const b of busquedas) {
    const criteria = parseCriteria(b.criteria);
    // Match semantics: zone match es mandatory (lead solo busca en X zona).
    // Price constraint: si la búsqueda define rango y el project tiene precio,
    // debe estar en rango. Si búsqueda no define rango → zone-only match.
    if (!zoneMatches(projectZone, criteria)) continue;

    const reasons: string[] = ['zone'];
    const min = typeof criteria.price_min === 'number' ? criteria.price_min : null;
    const max = typeof criteria.price_max === 'number' ? criteria.price_max : null;
    const hasPriceConstraint = min !== null || max !== null;
    if (hasPriceConstraint) {
      if (!priceMatches(projectPrice, criteria)) continue;
      reasons.push('price');
    }
    matches.push({
      id: b.id,
      leadId: b.lead_id,
      status: b.status,
      matchedReason: reasons,
    });
  }

  // STUB ADR-018 — Resend notification a asesor pendiente.
  // Activar L-NEW-STUDIO-MATCH-BUSQUEDAS-NOTIFY en H2 cuando Resend client
  // + email templates Studio (es-MX/en-US) estén shipped. Log estructurado mientras.
  if (matches.length > 0) {
    const payload = {
      stub: 'studio-match-busquedas-notify',
      message: 'STUB-NOT-ACTIVE — notification deferred to L-NEW-STUDIO-MATCH-BUSQUEDAS-NOTIFY',
      projectId,
      asesorId: project.user_id,
      matchCount: matches.length,
    };
    // biome-ignore lint/suspicious/noConsole: STUB ADR-018 fallback logging
    console.info('[studio.cross-functions.match-busquedas]', JSON.stringify(payload));
  }

  return {
    matches,
    count: matches.length,
    notificationStub: true,
  };
}
