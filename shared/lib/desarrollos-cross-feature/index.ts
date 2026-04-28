// ADR-056 — Studio Sprint 8 cross-feature M02 Desarrollos integration.
// Read-only API sobre proyectos + photos + marketing_assets para Studio + futuras features.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface DesarrolloAsset {
  readonly id: string;
  readonly storagePath: string;
  readonly assetType: string;
  readonly capturedAt: string | null;
  readonly etapa: string | null;
}

export interface DesarrolloProgress {
  readonly pctCompleted: number | null;
  readonly currentPhase: string | null;
  readonly lastUpdatedAt: string | null;
}

export interface DesarrolloDetails {
  readonly id: string;
  readonly nombre: string;
  readonly desarrolladoraId: string | null;
  readonly statusComercial: string | null;
  readonly ciudad: string | null;
  readonly colonia: string | null;
}

const PHASE_BY_CATEGORY: Record<string, string> = {
  exterior: 'planificacion',
  interior: 'acabados',
  amenidad: 'amenidades',
  cocina: 'acabados',
  bano: 'acabados',
  recamara: 'acabados',
  area_comun: 'amenidades',
};

export async function getDesarrolloDetails(
  desarrolloId: string,
): Promise<DesarrolloDetails | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('proyectos')
    .select('id, nombre, desarrolladora_id, status, ciudad, colonia')
    .eq('id', desarrolloId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    desarrolladoraId: data.desarrolladora_id ?? null,
    statusComercial: (data.status as string | null) ?? null,
    ciudad: data.ciudad ?? null,
    colonia: data.colonia ?? null,
  };
}

export async function getDesarrolloAssets(
  desarrolloId: string,
): Promise<ReadonlyArray<DesarrolloAsset>> {
  const supabase = createAdminClient();
  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_path, category, created_at')
    .eq('proyecto_id', desarrolloId)
    .order('created_at', { ascending: true })
    .limit(200);

  const photoAssets: DesarrolloAsset[] = (photos ?? [])
    .filter(
      (p): p is { id: string; storage_path: string; category: string | null; created_at: string } =>
        typeof p.storage_path === 'string',
    )
    .map((p) => ({
      id: p.id,
      storagePath: p.storage_path,
      assetType: 'photo',
      capturedAt: p.created_at,
      etapa: p.category ? (PHASE_BY_CATEGORY[p.category] ?? p.category) : null,
    }));

  const { data: marketing } = await supabase
    .from('marketing_assets')
    .select('id, url, asset_type, created_at')
    .eq('proyecto_id', desarrolloId)
    .order('created_at', { ascending: true })
    .limit(50);

  const marketingAssets: DesarrolloAsset[] = (marketing ?? [])
    .filter((m) => typeof m.url === 'string')
    .map((m) => ({
      id: m.id,
      storagePath: m.url as string,
      assetType: String(m.asset_type),
      capturedAt: m.created_at,
      etapa: null,
    }));

  return [...photoAssets, ...marketingAssets];
}

export async function getDesarrolloProgress(desarrolloId: string): Promise<DesarrolloProgress> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('proyectos')
    .select('meta, updated_at, status')
    .eq('id', desarrolloId)
    .maybeSingle();

  if (!data) {
    return { pctCompleted: null, currentPhase: null, lastUpdatedAt: null };
  }

  const meta = (data.meta as Record<string, unknown> | null) ?? {};
  const progress = meta.progress as Record<string, unknown> | undefined;

  const pct =
    progress && typeof progress.pct_completed === 'number' ? progress.pct_completed : null;
  const currentPhase =
    progress && typeof progress.current_phase === 'string'
      ? progress.current_phase
      : inferPhaseFromStatus(data.status as string | null);

  return {
    pctCompleted: pct,
    currentPhase,
    lastUpdatedAt: data.updated_at ?? null,
  };
}

export async function hasMinimumPhotosForSeries(
  desarrolloId: string,
  threshold: number,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('proyecto_id', desarrolloId);
  if (error) return false;
  return (count ?? 0) >= threshold;
}

function inferPhaseFromStatus(status: string | null): string | null {
  if (!status) return null;
  switch (status) {
    case 'preventa':
      return 'planificacion';
    case 'en_construccion':
      return 'construccion';
    case 'terminado':
      return 'entrega';
    default:
      return null;
  }
}
