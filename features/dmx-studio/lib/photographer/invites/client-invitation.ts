// F14.F.10 Sprint 9 BIBLIA — Client invitations: fotógrafo invita asesor cliente
// con video preview + link descarga branded. SUB-AGENT 3 scope: invitation_type
// 'client_invite' (sub-agent 5 maneja referral_program logic).
//
// STUB ADR-018 — Email envío real activable L-NEW-PHOTOGRAPHER-INVITE-EMAIL-LIVE:
// usa StudioMockEmailProvider default (canon resend/provider.ts), se promueve a
// ResendEmailProvider cuando founder OK consumo (RESEND_API_KEY + EMAIL_PROVIDER=resend).

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { getStudioEmailProvider } from '@/features/dmx-studio/lib/resend/provider';
import { baseLayout, escapeHtml } from '@/features/dmx-studio/lib/resend/templates/welcome-studio';
import type { Database } from '@/shared/types/database';

type StudioAdminClient = SupabaseClient<Database>;

export const INVITATION_EXPIRATION_DAYS = 30;
export const REFERRAL_TOKEN_LENGTH = 32;
export const CLIENT_INVITATION_SUBJECT = 'Tu video inmobiliario está listo';

export interface InviteClientWithVideoInput {
  readonly photographerUserId: string;
  readonly videoId: string;
  readonly clientEmail: string;
  readonly clientName?: string | null | undefined;
  readonly photographerBusinessName?: string | null | undefined;
  readonly acceptanceBaseUrl?: string | undefined;
}

export interface InviteClientWithVideoResult {
  readonly inviteId: string;
  readonly referralToken: string;
  readonly expiresAt: string;
  readonly emailMessageId: string | null;
  readonly emailAccepted: boolean;
}

export function generateReferralToken(): string {
  try {
    const raw = crypto.randomUUID().replace(/-/g, '');
    return raw.slice(0, REFERRAL_TOKEN_LENGTH);
  } catch {
    const a = Math.random().toString(36).slice(2);
    const b = Date.now().toString(36);
    const c = Math.random().toString(36).slice(2);
    return (a + b + c).slice(0, REFERRAL_TOKEN_LENGTH);
  }
}

export function computeExpiresAt(now: Date = new Date()): string {
  const ms = INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + ms).toISOString();
}

export interface RenderClientInviteHtmlInput {
  readonly clientName?: string | null | undefined;
  readonly photographerBusinessName?: string | null | undefined;
  readonly previewVideoUrl: string | null;
  readonly acceptanceUrl: string;
}

export function renderClientInviteHtml(input: RenderClientInviteHtmlInput): string {
  const greeting = input.clientName ? `Hola ${escapeHtml(input.clientName)},` : 'Hola,';
  const photographer = input.photographerBusinessName
    ? escapeHtml(input.photographerBusinessName)
    : 'tu fotógrafo';
  const previewBlock = input.previewVideoUrl
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
         Puedes ver una vista previa del video aquí:
         <a href="${escapeHtml(input.previewVideoUrl)}" style="color:#6366F1;">vista previa</a>.
       </p>`
    : '';
  const safeUrl = escapeHtml(input.acceptanceUrl);

  return baseLayout({
    title: CLIENT_INVITATION_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        ${photographer} preparó un video inmobiliario profesional para ti con DMX Studio.
      </p>
      ${previewBlock}
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:9999px;background:linear-gradient(90deg,#6366F1,#EC4899);color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">
          Ver video y descargar
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">
        Este enlace expira en ${INVITATION_EXPIRATION_DAYS} días. Si no esperabas este correo, puedes ignorarlo.
      </p>
    `,
  });
}

function buildAcceptanceUrl(token: string, base?: string): string {
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? 'https://desarrollosmx.com';
  const root = (base ?? fallback).replace(/\/$/, '');
  return `${root}/es-MX/studio/invite/${token}`;
}

async function fetchPhotographerSummary(
  supabase: StudioAdminClient,
  userId: string,
): Promise<{ id: string; businessName: string | null }> {
  const { data, error } = await supabase
    .from('studio_photographers')
    .select('id, business_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'photographer_profile_not_found' });
  }
  return { id: data.id, businessName: data.business_name };
}

async function fetchVideoPreview(
  supabase: StudioAdminClient,
  videoId: string,
  photographerUserId: string,
): Promise<{ storageUrl: string | null }> {
  const { data, error } = await supabase
    .from('studio_video_outputs')
    .select('id, storage_url, user_id')
    .eq('id', videoId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'video_not_found' });
  }
  if (data.user_id !== photographerUserId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'video_not_owned_by_photographer' });
  }
  return { storageUrl: data.storage_url };
}

export async function inviteClientWithVideo(
  supabase: StudioAdminClient,
  input: InviteClientWithVideoInput,
): Promise<InviteClientWithVideoResult> {
  const photographer = await fetchPhotographerSummary(supabase, input.photographerUserId);
  const video = await fetchVideoPreview(supabase, input.videoId, input.photographerUserId);

  const referralToken = generateReferralToken();
  const expiresAt = computeExpiresAt();

  const { data: inviteRow, error: insertError } = await supabase
    .from('studio_photographer_invites')
    .insert({
      photographer_id: photographer.id,
      invited_email: input.clientEmail,
      invited_name: input.clientName ?? null,
      invitation_type: 'client_invite',
      related_video_id: input.videoId,
      referral_token: referralToken,
      expires_at: expiresAt,
    })
    .select('id, referral_token, expires_at')
    .single();

  if (insertError || !inviteRow) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: insertError?.message ?? 'invite_insert_failed',
      cause: insertError ?? undefined,
    });
  }

  const acceptanceUrl = buildAcceptanceUrl(referralToken, input.acceptanceBaseUrl);
  const html = renderClientInviteHtml({
    clientName: input.clientName ?? null,
    photographerBusinessName: input.photographerBusinessName ?? photographer.businessName,
    previewVideoUrl: video.storageUrl,
    acceptanceUrl,
  });

  const provider = getStudioEmailProvider();
  const emailResult = await provider.send({
    to: input.clientEmail,
    subject: CLIENT_INVITATION_SUBJECT,
    html,
    tags: [
      { name: 'product', value: 'dmx-studio' },
      { name: 'studio_template', value: 'photographer_client_invite' },
    ],
  });

  return {
    inviteId: inviteRow.id,
    referralToken: inviteRow.referral_token,
    expiresAt: inviteRow.expires_at,
    emailMessageId: emailResult.providerMessageId,
    emailAccepted: emailResult.accepted,
  };
}
