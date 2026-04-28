// F14.F.10 Sprint 9 SUB-AGENT 4 — Marketplace application helper.
// Wrapper que invoca tRPC applyToDirectory + dispara email notify a admin.
//
// STUB ADR-018 — Admin review process H2.
// Actualmente la aprobación es manual (admin actualiza listing_status a 'verified'
// vía Supabase dashboard o consulta directa). UI de admin review está agendada
// como L-NEW-MARKETPLACE-ADMIN-REVIEW-UI para H2.
// Issue tracker: L-NEW-MARKETPLACE-ADMIN-REVIEW-UI.

import { getStudioEmailProvider } from '@/features/dmx-studio/lib/resend/provider';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface ApplyToDirectoryInput {
  readonly userId: string;
  readonly tags: ReadonlyArray<string>;
}

export interface ApplyToDirectoryResult {
  readonly listingId: string;
  readonly listingStatus: string;
  readonly notifyAccepted: boolean;
  readonly notifyError: string | null;
}

const ADMIN_NOTIFY_EMAIL = process.env.STUDIO_MARKETPLACE_ADMIN_EMAIL ?? 'admin@desarrollosmx.com';

function renderAdminNotifyHtml(args: {
  businessName: string;
  email: string;
  tags: ReadonlyArray<string>;
}): string {
  const tagList = args.tags.length > 0 ? args.tags.join(', ') : '(sin tags)';
  return `
    <h2>Nueva aplicación marketplace</h2>
    <p>Un fotógrafo aplicó al directorio público.</p>
    <ul>
      <li><strong>Nombre:</strong> ${escapeHtml(args.businessName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(args.email)}</li>
      <li><strong>Tags:</strong> ${escapeHtml(tagList)}</li>
    </ul>
    <p>Revisa la aplicación en Supabase tabla studio_photographer_directory (status='pending').</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Aplica al directorio marketplace + dispara notificación admin.
 * Invocado desde tRPC mutation o admin-review flow. Garantiza upsert de listing
 * con status pending + email a admin para review manual H1.
 */
export async function applyToDirectory(
  input: ApplyToDirectoryInput,
): Promise<ApplyToDirectoryResult> {
  const supabase = createAdminClient();
  const { data: photographer, error: phError } = await supabase
    .from('studio_photographers')
    .select('id, business_name, email')
    .eq('user_id', input.userId)
    .maybeSingle();

  if (phError) {
    throw new Error(`Failed to load photographer: ${phError.message}`);
  }
  if (!photographer) {
    throw new Error('Photographer profile not found');
  }

  const { data: listing, error: listingError } = await supabase
    .from('studio_photographer_directory')
    .upsert(
      {
        photographer_id: photographer.id,
        listing_status: 'pending' as const,
        tags: [...input.tags],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'photographer_id' },
    )
    .select('id, listing_status')
    .single();

  if (listingError || !listing) {
    throw new Error(`Failed to upsert directory listing: ${listingError?.message ?? 'unknown'}`);
  }

  const provider = getStudioEmailProvider();
  const sendResult = await provider.send({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `Nueva aplicación marketplace — ${photographer.business_name}`,
    html: renderAdminNotifyHtml({
      businessName: photographer.business_name,
      email: photographer.email,
      tags: input.tags,
    }),
    tags: [
      { name: 'product', value: 'dmx-studio' },
      { name: 'studio_template', value: 'marketplace_application' },
    ],
  });

  return {
    listingId: listing.id,
    listingStatus: listing.listing_status,
    notifyAccepted: sendResult.accepted,
    notifyError: sendResult.error,
  };
}
