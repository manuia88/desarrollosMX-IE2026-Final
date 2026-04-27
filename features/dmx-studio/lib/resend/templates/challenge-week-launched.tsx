// F14.F.5 Sprint 4 — DMX Studio Resend template "Nuevo challenge esta semana".
// Notifies the user that a community challenge has launched for the current week.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderChallengeWeekLaunchedInput {
  readonly name?: string | null | undefined;
  readonly challengeTitle: string;
  readonly challengeDescription: string;
  readonly weekStart: string; // ISO date YYYY-MM-DD
  readonly rewardXp: number;
}

export const CHALLENGE_WEEK_LAUNCHED_SUBJECT = 'Nuevo challenge esta semana';

function formatWeekStart(iso: string): string {
  // Render as DD/MM/YYYY to keep the template framework-free.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function renderChallengeWeekLaunchedHtml(input: RenderChallengeWeekLaunchedInput): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  const safeTitle = escapeHtml(input.challengeTitle);
  const safeDesc = escapeHtml(input.challengeDescription);
  const safeWeek = escapeHtml(formatWeekStart(input.weekStart));
  const xp = Math.max(0, Math.floor(input.rewardXp));

  return baseLayout({
    title: CHALLENGE_WEEK_LAUNCHED_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Esta semana lanzamos un nuevo challenge en DMX Studio. Completalo y suma XP a tu perfil.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
        <tr>
          <td style="padding:20px;">
            <div style="font-size:12px;line-height:1.4;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">
              Semana del ${safeWeek}
            </div>
            <div style="font-size:18px;font-weight:700;line-height:1.4;color:#0F172A;margin-bottom:10px;">
              ${safeTitle}
            </div>
            <div style="font-size:14px;line-height:1.55;color:#475569;margin-bottom:14px;">
              ${safeDesc}
            </div>
            <div style="display:inline-block;padding:6px 12px;border-radius:9999px;background:#EEF2FF;color:#4338CA;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;">
              Recompensa: ${xp} XP
            </div>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">
        Los challenges se reinician cada lunes. Tienes hasta el domingo para completarlo.
      </p>
    `,
  });
}
