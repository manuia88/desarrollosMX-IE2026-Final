// BLOQUE 11.J.8 — Newsletter × Causal Engine MOM section builder.
//
// Construye el párrafo causal MOM para newsletter mensual + scorecard digest,
// consumiendo la tabla `causal_explanations` (cache TTL-based). Caller cron
// NO regenera (service_role query directo, rate limit no aplica aquí;
// regenerate es responsabilidad del causal-engine tRPC procedure, ya wired
// en 11.I.bis con rate limit de 15 req/min por user).
//
// Comportamiento graceful: si NO hay explanation para (scope, period) →
// devuelve null con reason. Caller decide si fallback a narrativa
// determinística o simplemente omite la sección del email.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Citation } from '@/features/causal-engine/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

export type CausalHook = (params: {
  readonly scopeId: string;
  readonly scopeType: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly periodDate: string;
  readonly indexCode: string;
}) => Promise<{
  explanation_md: string;
  citations: readonly Citation[];
} | null>;

export interface CausalSectionCitation {
  readonly refId: string;
  readonly url: string;
  readonly label: string;
}

export interface CausalSectionBundle {
  readonly paragraph: string;
  readonly citations: readonly CausalSectionCitation[];
  readonly zoneLabel: string;
}

export type CausalSectionUnavailableReason = 'no_causal_for_period' | 'empty_explanation';

export interface CausalSectionUnavailable {
  readonly unavailable: true;
  readonly reason: CausalSectionUnavailableReason;
  readonly zoneLabel: string;
}

export interface BuildCausalSectionOptions {
  readonly scopeId: string;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly scopeType?: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly indexCode?: string;
  readonly locale?: string;
  readonly supabase?: SupabaseClient<Database>;
  readonly causalHook?: CausalHook | undefined;
  readonly siteUrl?: string;
  readonly maxCitations?: number;
}

const DEFAULT_SITE_URL = 'https://desarrollosmx.com';
const DEFAULT_LOCALE = 'es-MX';
const DEFAULT_INDEX_CODE = 'PULSE';
const DEFAULT_MAX_CITATIONS = 3;

interface CausalExplanationRow {
  readonly explanation_md: string;
  readonly citations: unknown;
  readonly generated_at: string;
}

// Extrae primer párrafo (hasta doble newline o fin). Limpia heading markers.
export function extractFirstParagraph(md: string | null | undefined): string {
  if (!md) return '';
  const trimmed = md.trim();
  if (!trimmed) return '';
  // Doble newline = paragraph break en markdown.
  const firstBlock = trimmed.split(/\n\s*\n/)[0] ?? trimmed;
  return firstBlock
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .trim();
}

function parseCitationsJson(raw: unknown): readonly Citation[] {
  if (!Array.isArray(raw)) return [];
  const out: Citation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const refId = c.ref_id;
    const type = c.type;
    const label = c.label;
    const source = c.source;
    if (
      typeof refId !== 'string' ||
      typeof type !== 'string' ||
      typeof label !== 'string' ||
      typeof source !== 'string'
    )
      continue;
    out.push({
      ref_id: refId,
      type: type as Citation['type'],
      label,
      value: typeof c.value === 'string' || typeof c.value === 'number' ? c.value : null,
      source,
      href: typeof c.href === 'string' ? c.href : null,
      as_of: typeof c.as_of === 'string' ? c.as_of : null,
    });
  }
  return out;
}

// Default URL pattern para citation sin href explícito. L-NN-CITATIONS-PAGE
// → FASE 13 Content: construir landing /fuentes/[refId] con metadata real.
export function buildCitationUrl(
  siteUrl: string,
  locale: string,
  refId: string,
  explicitHref: string | null | undefined,
): string {
  if (explicitHref && /^https?:\/\//.test(explicitHref)) return explicitHref;
  const trimmed = siteUrl.replace(/\/+$/, '');
  const encoded = encodeURIComponent(refId);
  return `${trimmed}/${locale}/fuentes/${encoded}`;
}

export function mapCitations(
  raw: readonly Citation[],
  siteUrl: string,
  locale: string,
  max: number,
): readonly CausalSectionCitation[] {
  return raw.slice(0, max).map((c) => ({
    refId: c.ref_id,
    url: buildCitationUrl(siteUrl, locale, c.ref_id, c.href ?? null),
    label: c.label,
  }));
}

export async function buildCausalSection(
  opts: BuildCausalSectionOptions,
): Promise<CausalSectionBundle | CausalSectionUnavailable> {
  const {
    scopeId,
    countryCode,
    periodDate,
    scopeType = 'colonia',
    indexCode = DEFAULT_INDEX_CODE,
    locale = DEFAULT_LOCALE,
    supabase,
    causalHook,
    siteUrl = DEFAULT_SITE_URL,
    maxCitations = DEFAULT_MAX_CITATIONS,
  } = opts;

  const client = supabase ?? createAdminClient();

  const zoneLabel = await resolveZoneLabel({
    scopeType,
    scopeId,
    countryCode,
    supabase: client,
  });

  // 1. Si caller inyectó causalHook (e.g. features/causal-engine wrapped),
  //    usarlo primero (respeta rate limit upstream + force cache semantics).
  if (causalHook) {
    const hooked = await causalHook({ scopeId, scopeType, periodDate, indexCode });
    if (hooked) {
      const paragraph = extractFirstParagraph(hooked.explanation_md);
      if (!paragraph) {
        return { unavailable: true, reason: 'empty_explanation', zoneLabel };
      }
      return {
        paragraph,
        citations: mapCitations(hooked.citations, siteUrl, locale, maxCitations),
        zoneLabel,
      };
    }
    // hook null → fall-through a DB (service_role puede ver cache ya
    // generado por otro proceso).
  }

  // 2. Cron/service_role query directo a tabla — no LLM, no rate limit.
  //    Busca por (scope_type, scope_id, period_date) — agnóstico al
  //    index_code específico (la query cae al más reciente).
  const { data, error } = await client
    .from('causal_explanations')
    .select('explanation_md, citations, generated_at')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('period_date', periodDate)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // DB error: graceful unavailable; caller log.
    return { unavailable: true, reason: 'no_causal_for_period', zoneLabel };
  }
  if (!data) {
    return { unavailable: true, reason: 'no_causal_for_period', zoneLabel };
  }

  const row = data as unknown as CausalExplanationRow;
  const paragraph = extractFirstParagraph(row.explanation_md);
  if (!paragraph) {
    return { unavailable: true, reason: 'empty_explanation', zoneLabel };
  }

  const citations = parseCitationsJson(row.citations);
  return {
    paragraph,
    citations: mapCitations(citations, siteUrl, locale, maxCitations),
    zoneLabel,
  };
}
