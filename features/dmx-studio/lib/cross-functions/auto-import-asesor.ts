// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Cross-function 1: auto-import datos asesor DMX → Studio brand kit.
// Pre-llena display_name, phone, zones (top 3 vía proyectos asignados),
// cities (top 3 vía proyectos asignados) + reuso country_code y métricas
// existentes (leads count, operaciones cerradas count) para personalizar
// onboarding Studio sin re-pedir datos al asesor.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface AutoImportResult {
  readonly displayName: string | null;
  readonly phone: string | null;
  readonly contactPhone: string | null;
  readonly zones: ReadonlyArray<string>;
  readonly cities: ReadonlyArray<string>;
  readonly country_code: string | null;
  readonly currentLeadsCount: number;
  readonly currentClosedDealsCount: number;
  readonly role: string | null;
  readonly isExistingDmxUser: boolean;
}

export interface ApplyAutoImportResult {
  readonly brandKitId: string;
  readonly importedFields: ReadonlyArray<string>;
}

const TOP_LIMIT = 3 as const;

function emptyResult(): AutoImportResult {
  return {
    displayName: null,
    phone: null,
    contactPhone: null,
    zones: [],
    cities: [],
    country_code: null,
    currentLeadsCount: 0,
    currentClosedDealsCount: 0,
    role: null,
    isExistingDmxUser: false,
  };
}

function topUnique(values: ReadonlyArray<string | null | undefined>, limit: number): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    ordered.push(trimmed);
    if (ordered.length >= limit) break;
  }
  return ordered;
}

export async function autoImportFromDmxProfile(
  supabase: AdminSupabase,
  userId: string,
): Promise<AutoImportResult> {
  const profileResp = await supabase
    .from('profiles')
    .select('id, full_name, phone, country_code, rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileResp.error) {
    throw new Error(`auto-import profiles fetch failed: ${profileResp.error.message}`);
  }

  const profile = profileResp.data;
  if (!profile) {
    return emptyResult();
  }

  const [leadsResp, dealsResp, brokersResp] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_asesor_id', userId),
    supabase
      .from('operaciones')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_id', userId)
      .eq('status', 'cerrada'),
    supabase
      .from('project_brokers')
      .select('proyecto_id, proyectos!inner(colonia, ciudad)')
      .eq('broker_user_id', userId)
      .eq('active', true)
      .order('assigned_at', { ascending: false })
      .limit(20),
  ]);

  if (leadsResp.error) {
    throw new Error(`auto-import leads count failed: ${leadsResp.error.message}`);
  }
  if (dealsResp.error) {
    throw new Error(`auto-import operaciones count failed: ${dealsResp.error.message}`);
  }
  if (brokersResp.error) {
    throw new Error(`auto-import project_brokers fetch failed: ${brokersResp.error.message}`);
  }

  type BrokerRow = {
    proyecto_id: string;
    proyectos: { colonia: string | null; ciudad: string | null } | null;
  };
  const brokerRows = (brokersResp.data ?? []) as ReadonlyArray<BrokerRow>;

  const zones = topUnique(
    brokerRows.map((row) => row.proyectos?.colonia ?? null),
    TOP_LIMIT,
  );
  const cities = topUnique(
    brokerRows.map((row) => row.proyectos?.ciudad ?? null),
    TOP_LIMIT,
  );

  return {
    displayName: profile.full_name,
    phone: profile.phone,
    contactPhone: profile.phone,
    zones,
    cities,
    country_code: profile.country_code,
    currentLeadsCount: leadsResp.count ?? 0,
    currentClosedDealsCount: dealsResp.count ?? 0,
    role: profile.rol,
    isExistingDmxUser: true,
  };
}

export async function applyAutoImportToBrandKit(
  supabase: AdminSupabase,
  userId: string,
): Promise<ApplyAutoImportResult> {
  const imported = await autoImportFromDmxProfile(supabase, userId);
  if (!imported.isExistingDmxUser) {
    throw new Error(
      `apply-auto-import skipped: profile ${userId} not found (isExistingDmxUser=false)`,
    );
  }

  const importedFields: string[] = [];

  const existingResp = await supabase
    .from('studio_brand_kits')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (existingResp.error) {
    throw new Error(`apply-auto-import brand_kit fetch failed: ${existingResp.error.message}`);
  }

  const payload = {
    user_id: userId,
    display_name: imported.displayName,
    contact_phone: imported.contactPhone,
    zones: [...imported.zones],
    cities: [...imported.cities],
    is_default: true,
  };

  if (imported.displayName !== null) importedFields.push('displayName');
  if (imported.contactPhone !== null) importedFields.push('contactPhone');
  if (imported.zones.length > 0) importedFields.push('zones');
  if (imported.cities.length > 0) importedFields.push('cities');

  let brandKitId: string;
  if (existingResp.data?.id) {
    const updateResp = await supabase
      .from('studio_brand_kits')
      .update(payload)
      .eq('id', existingResp.data.id)
      .select('id')
      .single();
    if (updateResp.error || !updateResp.data) {
      throw new Error(
        `apply-auto-import brand_kit update failed: ${updateResp.error?.message ?? 'no data'}`,
      );
    }
    brandKitId = updateResp.data.id;
  } else {
    const insertResp = await supabase
      .from('studio_brand_kits')
      .insert(payload)
      .select('id')
      .single();
    if (insertResp.error || !insertResp.data) {
      throw new Error(
        `apply-auto-import brand_kit insert failed: ${insertResp.error?.message ?? 'no data'}`,
      );
    }
    brandKitId = insertResp.data.id;
  }

  const extResp = await supabase
    .from('studio_users_extension')
    .upsert(
      {
        user_id: userId,
        onboarding_step: 'brand_kit_imported',
        brand_kit_completed: true,
      },
      { onConflict: 'user_id' },
    )
    .select('user_id')
    .single();
  if (extResp.error) {
    throw new Error(`apply-auto-import users_extension upsert failed: ${extResp.error.message}`);
  }
  importedFields.push('onboardingStep');

  return {
    brandKitId,
    importedFields,
  };
}
