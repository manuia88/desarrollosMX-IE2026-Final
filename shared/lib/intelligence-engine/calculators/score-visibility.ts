// D18 FASE 10 SESIÓN 3/3 — score visibility filter (public vs internal).
// Algunos scores (E01, E02, E03) contienen data sensible (márgenes dev,
// cost basis, leads raw). G01/D02/D09 son wrappers públicos que solo
// exponen campos whitelisted. Este helper lee ie_score_visibility_rules
// (seed migration 20260420123000) y filtra CalculatorOutput/row para
// público.
//
// Uso tRPC: authenticatedProcedure (non-admin) → filterForPublic(rows).
// Admin/superadmin bypass el filter y ven todo.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ScoreVisibility = 'public' | 'internal' | 'restricted';

export interface VisibilityRule {
  readonly score_id: string;
  readonly visibility: ScoreVisibility;
  readonly allowed_fields: readonly string[];
  readonly excluded_fields: readonly string[];
  readonly tenant_scope_required: boolean;
}

// Cache 1h — mismo TTL que tier_requirements. Vercel Fluid reutiliza.
const RULES_CACHE = new Map<string, { rule: VisibilityRule | null; expires_at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function loadVisibilityRule(
  supabase: SupabaseClient,
  scoreId: string,
): Promise<VisibilityRule | null> {
  const cached = RULES_CACHE.get(scoreId);
  const now_ms = Date.now();
  if (cached && cached.expires_at > now_ms) return cached.rule;
  try {
    const { data, error } = await (supabase as unknown as SupabaseClient)
      .from('ie_score_visibility_rules' as never)
      .select('score_id, visibility, allowed_fields, excluded_fields, tenant_scope_required')
      .eq('score_id' as never, scoreId)
      .limit(1);
    if (error || !data) {
      RULES_CACHE.set(scoreId, { rule: null, expires_at: now_ms + CACHE_TTL_MS });
      return null;
    }
    const rows = data as unknown as Array<{
      score_id: string;
      visibility: ScoreVisibility;
      allowed_fields: unknown;
      excluded_fields: unknown;
      tenant_scope_required: boolean;
    }>;
    const first = rows[0];
    if (!first) {
      RULES_CACHE.set(scoreId, { rule: null, expires_at: now_ms + CACHE_TTL_MS });
      return null;
    }
    const rule: VisibilityRule = {
      score_id: first.score_id,
      visibility: first.visibility,
      allowed_fields: toStringArray(first.allowed_fields),
      excluded_fields: toStringArray(first.excluded_fields),
      tenant_scope_required: first.tenant_scope_required,
    };
    RULES_CACHE.set(scoreId, { rule, expires_at: now_ms + CACHE_TTL_MS });
    return rule;
  } catch {
    return cached?.rule ?? null;
  }
}

function toStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

// isPublicField — dado un rule y un campo (dot-path como 'components.internal_margin'),
// retorna true si el campo es expuesto públicamente.
export function isPublicField(rule: VisibilityRule | null, fieldPath: string): boolean {
  if (!rule) return true; // score sin rule → asume público (backward compat)
  if (rule.visibility === 'public') {
    if (rule.allowed_fields.length === 0) return !isExcluded(rule, fieldPath);
    // Whitelist mode: campo pasa solo si matchea allowed_fields (exact o prefix).
    return rule.allowed_fields.some(
      (allowed) => fieldPath === allowed || fieldPath.startsWith(`${allowed}.`),
    );
  }
  if (rule.visibility === 'internal' || rule.visibility === 'restricted') {
    // Internal: solo admin ve todo → non-admin bloqueado completo.
    return false;
  }
  return true;
}

function isExcluded(rule: VisibilityRule, fieldPath: string): boolean {
  return rule.excluded_fields.some(
    (excluded) => fieldPath === excluded || fieldPath.startsWith(`${excluded}.`),
  );
}

// filterForPublic — retorna nueva row con solo los campos públicos visibles.
// Si rule.visibility es internal/restricted → retorna null (row invisible).
// Si public → preserva campos root y aplica whitelisted paths para components/provenance/etc.
export function filterForPublic(
  row: Readonly<Record<string, unknown>>,
  rule: VisibilityRule | null,
): Record<string, unknown> | null {
  if (!rule) return { ...row };
  if (rule.visibility !== 'public') return null;

  if (rule.allowed_fields.length === 0) {
    // No whitelist — aplica exclusions. Top-level keys se borran completos;
    // nested paths se borran solo en el sub-objeto (deep clone top-level).
    const filtered: Record<string, unknown> = {};
    const nestedByTop = new Map<string, Set<string>>();
    const topExclude = new Set<string>();
    for (const excluded of rule.excluded_fields) {
      const parts = excluded.split('.');
      const head = parts[0];
      if (!head) continue;
      if (parts.length === 1) {
        topExclude.add(head);
      } else {
        if (!nestedByTop.has(head)) nestedByTop.set(head, new Set());
        const set = nestedByTop.get(head);
        if (set) set.add(parts.slice(1).join('.'));
      }
    }
    for (const [key, value] of Object.entries(row)) {
      if (topExclude.has(key)) continue;
      const nested = nestedByTop.get(key);
      if (nested && value && typeof value === 'object' && !Array.isArray(value)) {
        const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
        for (const path of nested) {
          deletePath(clone, path);
        }
        filtered[key] = clone;
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  // Whitelist mode — construye row con solo campos allowed + top-level scaffold.
  const out: Record<string, unknown> = {
    score_type: row.score_type,
    country_code: row.country_code,
    zone_id: row.zone_id,
    project_id: row.project_id,
    period_date: row.period_date,
  };
  for (const allowed of rule.allowed_fields) {
    setByPath(out, allowed, getByPath(row, allowed));
  }
  return out;
}

function getByPath(obj: Readonly<Record<string, unknown>>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function deletePath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  const last = parts.pop();
  if (!last) return;
  let current: Record<string, unknown> = obj;
  for (const part of parts) {
    const next = current[part];
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      current = next as Record<string, unknown>;
    } else {
      return;
    }
  }
  delete current[last];
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (value === undefined) return;
  const parts = path.split('.');
  const last = parts.pop();
  if (!last) return;
  let current: Record<string, unknown> = obj;
  for (const part of parts) {
    const next = current[part];
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      current = next as Record<string, unknown>;
    } else {
      const fresh: Record<string, unknown> = {};
      current[part] = fresh;
      current = fresh;
    }
  }
  current[last] = value;
}

// Helper batch: aplica filterForPublic a array de rows, dropea los null.
export async function filterRowsForPublic(
  supabase: SupabaseClient,
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<ReadonlyArray<Record<string, unknown>>> {
  const uniqScoreIds = new Set<string>();
  for (const row of rows) {
    const sid = typeof row.score_type === 'string' ? row.score_type : null;
    if (sid) uniqScoreIds.add(sid);
  }
  const rules = new Map<string, VisibilityRule | null>();
  await Promise.all(
    Array.from(uniqScoreIds).map(async (sid) => {
      rules.set(sid, await loadVisibilityRule(supabase, sid));
    }),
  );
  const filtered: Record<string, unknown>[] = [];
  for (const row of rows) {
    const sid = typeof row.score_type === 'string' ? row.score_type : null;
    const rule = sid ? (rules.get(sid) ?? null) : null;
    const out = filterForPublic(row, rule);
    if (out) filtered.push(out);
  }
  return filtered;
}

// Helper para tests — reset cache.
export function clearVisibilityCacheForTesting(): void {
  RULES_CACHE.clear();
}
