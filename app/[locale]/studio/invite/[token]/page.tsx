// F14.F.10 Sprint 9 BIBLIA SUB-AGENT 3 — Public route invitación.
// RSC carga datos vía supabase admin client (publicProcedure mirror) y delega
// CTA aceptación a InvitationAcceptancePage client component.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  type InvitationAcceptanceContext,
  InvitationAcceptancePage,
} from '@/features/dmx-studio/components/public/InvitationAcceptancePage';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string; token: string }>;
}

interface InviteContextLoad {
  readonly context: InvitationAcceptanceContext;
  readonly invalid: boolean;
}

async function loadContext(token: string): Promise<InviteContextLoad> {
  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from('studio_photographer_invites')
    .select(
      'id, photographer_id, related_video_id, invited_email, invited_name, expires_at, status',
    )
    .eq('referral_token', token)
    .maybeSingle();

  const empty: InvitationAcceptanceContext = {
    photographerBusinessName: null,
    photographerSlug: null,
    photographerBio: null,
    videoStorageUrl: null,
    videoThumbnailUrl: null,
    invitedEmail: null,
    invitedName: null,
  };

  if (!invite) return { context: empty, invalid: true };

  const expired = new Date(invite.expires_at).getTime() < Date.now();
  if (expired) return { context: empty, invalid: true };

  const { data: photographer } = await supabase
    .from('studio_photographers')
    .select('business_name, slug, bio')
    .eq('id', invite.photographer_id)
    .maybeSingle();

  const { data: video } = invite.related_video_id
    ? await supabase
        .from('studio_video_outputs')
        .select('storage_url, thumbnail_url')
        .eq('id', invite.related_video_id)
        .maybeSingle()
    : { data: null };

  return {
    context: {
      photographerBusinessName: photographer?.business_name ?? null,
      photographerSlug: photographer?.slug ?? null,
      photographerBio: photographer?.bio ?? null,
      videoStorageUrl: video?.storage_url ?? null,
      videoThumbnailUrl: video?.thumbnail_url ?? null,
      invitedEmail: invite.invited_email,
      invitedName: invite.invited_name,
    },
    invalid: false,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const { context, invalid } = await loadContext(token);
  if (invalid) {
    return { title: 'Invitación no disponible · DMX Studio' };
  }
  const businessName = context.photographerBusinessName ?? 'Tu fotógrafo';
  return {
    title: `${businessName} preparó un video para ti · DMX Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function InvitationTokenPage({ params }: PageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const { context, invalid } = await loadContext(token);

  return <InvitationAcceptancePage token={token} initialContext={context} invalid={invalid} />;
}
