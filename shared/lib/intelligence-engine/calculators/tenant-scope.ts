// D33 FASE 10 SESIÓN 3/3 — multi-tenant scoping enforcement para N4.
// E01/E02/E03 son scores institucionales (FIBRAs, fondos, devs) que deben
// respetar tenant boundaries: cliente A no ve data de cliente B.
//
// H1 scope: validación permisiva. Si input.tenant_id NO provisto → scope
// global, backward compat con todos los calculators existentes. Si SI
// provisto → debe existir en tenant_scopes (catálogo creado migration
// 20260420123000). Enforcement estricto RLS contra score rows con tenant_id
// llega H2 junto con el producto institucional.
//
// Lectura de tenant_scope_required viene desde ie_score_visibility_rules
// (mismo migration). Si el score lo marca true y input.tenant_id es null,
// runScore rechaza con TenantScopeViolation.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalculatorInput } from './base';

export class TenantScopeViolation extends Error {
  readonly code = 'TENANT_SCOPE_VIOLATION';
  readonly scoreId: string;
  readonly reason: 'unknown_tenant' | 'tenant_required_missing' | 'tenant_lookup_failed';

  constructor(
    scoreId: string,
    reason: 'unknown_tenant' | 'tenant_required_missing' | 'tenant_lookup_failed',
    message: string,
  ) {
    super(message);
    this.name = 'TenantScopeViolation';
    this.scoreId = scoreId;
    this.reason = reason;
  }
}

export interface TenantScopeResult {
  readonly ok: boolean;
  readonly violation?: TenantScopeViolation;
}

// Cache 5min de tenant_ids conocidos + tenant_scope_required por score.
// Vercel Fluid Compute reutiliza instancia → cache cruza invocaciones.
const TENANT_CACHE = new Map<string, { ids: Set<string>; expires_at: number }>();
const VISIBILITY_CACHE = new Map<string, { required: boolean; expires_at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadKnownTenantIds(supabase: SupabaseClient): Promise<Set<string>> {
  const cached = TENANT_CACHE.get('all');
  const now_ms = Date.now();
  if (cached && cached.expires_at > now_ms) return cached.ids;
  const { data, error } = await (supabase as unknown as SupabaseClient)
    .from('tenant_scopes' as never)
    .select('id');
  if (error || !data) {
    return cached?.ids ?? new Set<string>();
  }
  const ids = new Set<string>((data as unknown as Array<{ id: string }>).map((r) => r.id));
  TENANT_CACHE.set('all', { ids, expires_at: now_ms + CACHE_TTL_MS });
  return ids;
}

async function loadTenantScopeRequired(
  supabase: SupabaseClient,
  scoreId: string,
): Promise<boolean> {
  const cached = VISIBILITY_CACHE.get(scoreId);
  const now_ms = Date.now();
  if (cached && cached.expires_at > now_ms) return cached.required;
  const { data, error } = await (supabase as unknown as SupabaseClient)
    .from('ie_score_visibility_rules' as never)
    .select('tenant_scope_required')
    .eq('score_id' as never, scoreId)
    .limit(1);
  if (error || !data) {
    return cached?.required ?? false;
  }
  const rows = data as unknown as Array<{ tenant_scope_required: boolean }>;
  const first = rows[0];
  const required = first?.tenant_scope_required ?? false;
  VISIBILITY_CACHE.set(scoreId, { required, expires_at: now_ms + CACHE_TTL_MS });
  return required;
}

export async function validateTenantScope(
  input: CalculatorInput,
  scoreId: string,
  supabase: SupabaseClient,
): Promise<TenantScopeResult> {
  let scopeRequired = false;
  try {
    scopeRequired = await loadTenantScopeRequired(supabase, scoreId);
  } catch {
    // Lookup fail no bloquea scores ya no-tenant-required (backward compat).
    return { ok: true };
  }

  // Score no requiere tenant → acepta cualquier input (con o sin tenant_id).
  if (!scopeRequired) {
    if (!input.tenant_id) return { ok: true };
    // Si user provee tenant_id opcionalmente, validar que existe (evita IDs random).
    const known = await loadKnownTenantIds(supabase).catch(() => new Set<string>());
    if (known.size === 0) return { ok: true }; // H1 catálogo vacío = permisivo
    if (!known.has(input.tenant_id)) {
      return {
        ok: false,
        violation: new TenantScopeViolation(
          scoreId,
          'unknown_tenant',
          `tenant_id ${input.tenant_id} not found in tenant_scopes`,
        ),
      };
    }
    return { ok: true };
  }

  // Score requiere tenant → input.tenant_id obligatorio.
  if (!input.tenant_id) {
    return {
      ok: false,
      violation: new TenantScopeViolation(
        scoreId,
        'tenant_required_missing',
        `${scoreId} requires tenant_id (institutional score)`,
      ),
    };
  }

  const known = await loadKnownTenantIds(supabase).catch(() => new Set<string>());
  if (known.size === 0) {
    // Catálogo vacío con score requiring tenant → config inconsistente, bloquear.
    return {
      ok: false,
      violation: new TenantScopeViolation(
        scoreId,
        'tenant_lookup_failed',
        `tenant_scopes catalog empty but ${scoreId} requires tenant`,
      ),
    };
  }
  if (!known.has(input.tenant_id)) {
    return {
      ok: false,
      violation: new TenantScopeViolation(
        scoreId,
        'unknown_tenant',
        `tenant_id ${input.tenant_id} not found in tenant_scopes`,
      ),
    };
  }
  return { ok: true };
}

// Helper para tests — resetea caches (sin TTL wait).
export function clearTenantScopeCachesForTesting(): void {
  TENANT_CACHE.clear();
  VISIBILITY_CACHE.clear();
}
