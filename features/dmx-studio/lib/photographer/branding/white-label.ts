// F14.F.10 Sprint 9 BIBLIA — White-label upgrade Foto plan.
// Reemplaza DMX footer ("Generado con DMX Studio") con custom_footer del fotógrafo.
// Slug-based URL H1 (/studio/foto/{slug}); custom dominio H2 (STUB ADR-018).
// Plan validation: solo Foto plan paga upgrade ($+10/mes white-label tier).

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

const FOOTER_MAX_LENGTH = 200;

export interface ConfigureWhiteLabelInput {
  readonly photographerId: string;
  readonly enabled: boolean;
  readonly customFooter: string | null;
}

export interface ConfigureWhiteLabelResult {
  readonly photographerId: string;
  readonly enabled: boolean;
  readonly customFooter: string | null;
  readonly slugBasedUrl: string;
}

export interface PhotographerWhiteLabelConfig {
  readonly slug: string;
  readonly whiteLabelEnabled: boolean;
  readonly whiteLabelCustomFooter: string | null;
}

export interface ApplyWhiteLabelOutput {
  readonly footerText: string;
  readonly isWhiteLabel: boolean;
  readonly slugBasedUrl: string;
}

type AdminClient = ReturnType<typeof createAdminClient>;

export interface WhiteLabelDeps {
  readonly client?: AdminClient;
}

const DEFAULT_DMX_FOOTER = 'Generado con DMX Studio';

function buildSlugBasedUrl(slug: string): string {
  return `/studio/foto/${slug}`;
}

function sanitizeFooter(footer: string | null): string | null {
  if (footer === null) return null;
  const trimmed = footer.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > FOOTER_MAX_LENGTH) {
    throw new Error(
      `white_label.footer_too_long: max ${FOOTER_MAX_LENGTH} chars (received ${trimmed.length})`,
    );
  }
  return trimmed;
}

/**
 * Configure white-label settings (enabled flag + custom footer) para Foto plan.
 *
 * Plan validation: caller debe verificar plan === 'foto' antes de invocar.
 * Slug-based URL H1 returned. Custom dominio H2.
 *
 * STUB ADR-018 — activar H2 cuando founder valida demand.
 * Custom dominio (ej. videos.miestudio.com) requiere DNS verification + SSL provisioning.
 * H1: solo slug-based URL /studio/foto/{slug}. customDomain field NO existe BD.
 */
export async function configureWhiteLabel(
  input: ConfigureWhiteLabelInput,
  deps: WhiteLabelDeps = {},
): Promise<ConfigureWhiteLabelResult> {
  const supabase = deps.client ?? createAdminClient();
  const safeFooter = sanitizeFooter(input.customFooter);

  try {
    const { data, error } = await supabase
      .from('studio_photographers')
      .update({
        white_label_enabled: input.enabled,
        white_label_custom_footer: safeFooter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.photographerId)
      .select('id, slug, white_label_enabled, white_label_custom_footer')
      .single();

    if (error) {
      throw new Error(`white_label.configure_failed: ${error.message}`);
    }

    return {
      photographerId: data.id,
      enabled: data.white_label_enabled,
      customFooter: data.white_label_custom_footer,
      slugBasedUrl: buildSlugBasedUrl(data.slug),
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.photographer.branding', op: 'configureWhiteLabel' },
      extra: { photographerId: input.photographerId, enabled: input.enabled },
    });
    throw err;
  }
}

/**
 * Resuelve footer text + URL canon para output de video del fotógrafo.
 * Cuando white_label_enabled=true Y custom_footer presente → usa custom_footer.
 * Caso contrario → usa default DMX footer.
 *
 * Pure function (NO side-effects). Caller resuelve photographer config + invoca.
 */
export function applyWhiteLabelToOutput(
  videoUrl: string,
  photographer: PhotographerWhiteLabelConfig,
): ApplyWhiteLabelOutput {
  if (!videoUrl || videoUrl.trim().length === 0) {
    throw new Error('white_label.invalid_video_url');
  }

  const useWhiteLabel =
    photographer.whiteLabelEnabled && photographer.whiteLabelCustomFooter !== null;
  const footerText = useWhiteLabel
    ? (photographer.whiteLabelCustomFooter ?? DEFAULT_DMX_FOOTER)
    : DEFAULT_DMX_FOOTER;

  return {
    footerText,
    isWhiteLabel: useWhiteLabel,
    slugBasedUrl: buildSlugBasedUrl(photographer.slug),
  };
}

export const __test__ = {
  buildSlugBasedUrl,
  sanitizeFooter,
  DEFAULT_DMX_FOOTER,
  FOOTER_MAX_LENGTH,
};
