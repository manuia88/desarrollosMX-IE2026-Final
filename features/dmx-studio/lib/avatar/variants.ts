// F14.F.8 Sprint 7 BIBLIA Upgrade 2 — Avatar variants (3 estilos).

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export type AvatarVariantStyle = 'formal' | 'casual' | 'branded';

export interface VariantBranding {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly logoUrl: string | null;
}

export interface VariantGenerationRequest {
  readonly avatarId: string;
  readonly userId: string;
  readonly styles: ReadonlyArray<AvatarVariantStyle>;
}

export async function generateAvatarVariants(
  req: VariantGenerationRequest,
): Promise<{ variants: ReadonlyArray<{ id: string; style: AvatarVariantStyle }> }> {
  const supabase = createAdminClient();

  const { data: avatarRaw } = await supabase
    .from('studio_avatars')
    .select('id, status')
    .eq('id', req.avatarId)
    .eq('user_id', req.userId)
    .maybeSingle();
  const avatar = avatarRaw as { id: string; status: string } | null;
  if (!avatar) throw new TRPCError({ code: 'NOT_FOUND' });
  if (avatar.status !== 'ready') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Avatar debe estar ready antes de generar variants.',
    });
  }

  let branding: VariantBranding | null = null;
  if (req.styles.includes('branded')) {
    const { data: brandRaw } = await supabase
      .from('studio_brand_kits')
      .select('primary_color, secondary_color, logo_url')
      .eq('user_id', req.userId)
      .maybeSingle();
    const brand = brandRaw as {
      primary_color: string;
      secondary_color: string;
      logo_url: string | null;
    } | null;
    if (brand) {
      branding = {
        primaryColor: brand.primary_color,
        secondaryColor: brand.secondary_color,
        logoUrl: brand.logo_url,
      };
    }
  }

  const rows = req.styles.map((style, idx) => ({
    avatar_id: req.avatarId,
    style,
    is_default: idx === 0,
    preview_image_url: brandedPreviewUrl(style, branding),
  }));

  const { data, error } = await supabase
    .from('studio_avatar_variants')
    .upsert(rows, { onConflict: 'avatar_id,style' })
    .select('id, style');
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

  const variants = (data ?? []) as Array<{ id: string; style: AvatarVariantStyle }>;
  return { variants };
}

function brandedPreviewUrl(style: AvatarVariantStyle, branding: VariantBranding | null): string {
  if (style === 'branded' && branding?.logoUrl) {
    return branding.logoUrl;
  }
  return `dmx://avatar-style/${style}`;
}
