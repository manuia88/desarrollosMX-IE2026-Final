// F14.F.10 Sprint 9 BIBLIA LATERAL 6 — Referrer 20% primer mes commission program.
// Acepta referral token + valida invitation_type='referral_program' + marca subscribed_to_pro
// + INSERT commission_earned_usd (20% del primer mes plan, hardcoded canon).
// Trigger Resend "Has ganado $X de referido" via getStudioEmailProvider (compose read-only).

import { getStudioEmailProvider } from '@/features/dmx-studio/lib/resend/provider';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

/** Canon hardcoded H1: 20% primer mes plan Pro. NO configurable per-photographer. */
export const REFERRAL_COMMISSION_PCT = 20;

/** Plan Pro Studio mensual base USD (mirror stripe-products F14.F.1). */
const PRO_PLAN_MONTHLY_USD = 67;

export interface ProcessReferralAcceptanceInput {
  readonly referralToken: string;
}

export interface ProcessReferralAcceptanceResult {
  readonly ok: true;
  readonly inviteId: string;
  readonly photographerId: string;
  readonly commissionEarnedUsd: number;
  readonly emailSent: boolean;
}

type AdminClient = ReturnType<typeof createAdminClient>;

export interface ProcessReferralAcceptanceDeps {
  readonly client?: AdminClient;
  readonly emailProvider?: ReturnType<typeof getStudioEmailProvider>;
  readonly planMonthlyUsd?: number;
}

function calculateCommissionUsd(planMonthlyUsd: number): number {
  return Number(((planMonthlyUsd * REFERRAL_COMMISSION_PCT) / 100).toFixed(2));
}

function renderReferralCommissionHtml(args: {
  photographerEmail: string;
  inviteeEmail: string;
  commissionUsd: number;
}): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Has ganado comisión de referido</title>
  </head>
  <body style="margin:0;padding:0;background:#F0EBE0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EBE0;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 40px 24px;">
                <div style="font-weight:800;font-size:18px;letter-spacing:-0.01em;color:#6366F1;">DMX Studio</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">Hola,</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
                  Has ganado <strong>USD ${args.commissionUsd.toFixed(2)}</strong> de comisión por referido.
                  Tu invitado <strong>${escapeHtml(args.inviteeEmail)}</strong> se suscribió a DMX Studio Pro.
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
                  El pago será procesado dentro de los próximos 30 días vía ACH/Wire.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.55;color:#64748B;">
                Desarrollos MX | Mexico
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Procesa aceptación referral cuando invitee se suscribe a Pro.
 * Validate invitation_type='referral_program', set subscribed_to_pro=true, insert
 * commission_earned_usd hardcoded 20% canon, trigger email Resend.
 */
export async function processReferralAcceptance(
  input: ProcessReferralAcceptanceInput,
  deps: ProcessReferralAcceptanceDeps = {},
): Promise<ProcessReferralAcceptanceResult> {
  const supabase = deps.client ?? createAdminClient();
  const planMonthlyUsd = deps.planMonthlyUsd ?? PRO_PLAN_MONTHLY_USD;

  const { data: invite, error: fetchErr } = await supabase
    .from('studio_photographer_invites')
    .select(
      'id, photographer_id, invited_email, invitation_type, status, subscribed_to_pro, expires_at',
    )
    .eq('referral_token', input.referralToken)
    .maybeSingle();

  if (fetchErr) {
    sentry.captureException(fetchErr, {
      tags: {
        feature: 'dmx-studio.photographer.commission',
        op: 'processReferralAcceptance.fetchInvite',
      },
      extra: { referralToken: input.referralToken },
    });
    throw new Error(`referrer_program.fetch_invite_failed: ${fetchErr.message}`);
  }

  if (!invite) {
    throw new Error('referrer_program.invite_not_found');
  }

  if (invite.invitation_type !== 'referral_program') {
    throw new Error('referrer_program.invalid_invitation_type');
  }

  if (invite.subscribed_to_pro) {
    throw new Error('referrer_program.already_processed');
  }

  if (new Date(invite.expires_at) < new Date()) {
    throw new Error('referrer_program.invite_expired');
  }

  const commissionEarnedUsd = calculateCommissionUsd(planMonthlyUsd);

  const updatePayload: {
    subscribed_to_pro: true;
    commission_earned_usd: number;
    status: 'accepted';
    accepted_at?: string;
  } = {
    subscribed_to_pro: true,
    commission_earned_usd: commissionEarnedUsd,
    status: 'accepted',
  };
  if (invite.status !== 'accepted') {
    updatePayload.accepted_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from('studio_photographer_invites')
    .update(updatePayload)
    .eq('id', invite.id);

  if (updateErr) {
    sentry.captureException(updateErr, {
      tags: {
        feature: 'dmx-studio.photographer.commission',
        op: 'processReferralAcceptance.updateInvite',
      },
      extra: { inviteId: invite.id, referralToken: input.referralToken },
    });
    throw new Error(`referrer_program.update_invite_failed: ${updateErr.message}`);
  }

  let emailSent = false;
  try {
    const { data: photographer } = await supabase
      .from('studio_photographers')
      .select('email')
      .eq('id', invite.photographer_id)
      .maybeSingle();

    if (photographer?.email) {
      const provider = deps.emailProvider ?? getStudioEmailProvider();
      const html = renderReferralCommissionHtml({
        photographerEmail: photographer.email,
        inviteeEmail: invite.invited_email,
        commissionUsd: commissionEarnedUsd,
      });
      const result = await provider.send({
        to: photographer.email,
        subject: `Has ganado USD ${commissionEarnedUsd.toFixed(2)} de referido`,
        html,
        tags: [
          { name: 'product', value: 'dmx-studio' },
          { name: 'studio_template', value: 'referral_commission_earned' },
        ],
      });
      emailSent = result.accepted;
    }
  } catch (err) {
    sentry.captureException(err, {
      tags: {
        feature: 'dmx-studio.photographer.commission',
        op: 'processReferralAcceptance.email',
      },
      extra: { inviteId: invite.id },
    });
    // Email es best-effort — no romper flow si falla.
  }

  return {
    ok: true,
    inviteId: invite.id,
    photographerId: invite.photographer_id,
    commissionEarnedUsd,
    emailSent,
  };
}

export const __test__ = {
  calculateCommissionUsd,
  PRO_PLAN_MONTHLY_USD,
  escapeHtml,
};
