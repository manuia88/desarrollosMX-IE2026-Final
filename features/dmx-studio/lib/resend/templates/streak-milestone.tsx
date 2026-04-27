// F14.F.5 Sprint 4 — DMX Studio Resend template "Streak milestone unlocked".
// Fires when the user crosses a streak threshold (7, 30, 100, 365 days).

import type { BadgeKey } from '../../streaks/types';
import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderStreakMilestoneInput {
  readonly name?: string | null | undefined;
  readonly badgeKey: BadgeKey;
  readonly currentStreakDays: number;
}

interface BadgeCopy {
  readonly title: string;
  readonly subtitle: string;
}

const BADGE_COPY: Record<BadgeKey, BadgeCopy> = {
  streak_7: {
    title: 'Una semana de constancia',
    subtitle: '7 dias seguidos publicando contenido en DMX Studio.',
  },
  streak_30: {
    title: 'Un mes imparable',
    subtitle: '30 dias seguidos. Tu marca personal esta tomando forma.',
  },
  streak_100: {
    title: '100 dias de creacion sin pausa',
    subtitle: 'Estas en el top 1% de asesores activos en DMX Studio.',
  },
  streak_365: {
    title: 'Un ano completo de Studio',
    subtitle: '365 dias consecutivos. Eres un Founder de la nueva era.',
  },
};

export const STREAK_MILESTONE_SUBJECT_PREFIX = 'Nuevo logro desbloqueado';

export function renderStreakMilestoneSubject(badgeKey: BadgeKey): string {
  const copy = BADGE_COPY[badgeKey];
  return `${STREAK_MILESTONE_SUBJECT_PREFIX}: ${copy.title}`;
}

export function renderStreakMilestoneHtml(input: RenderStreakMilestoneInput): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  const copy = BADGE_COPY[input.badgeKey];
  const safeTitle = escapeHtml(copy.title);
  const safeSubtitle = escapeHtml(copy.subtitle);
  const days = Math.max(0, Math.floor(input.currentStreakDays));

  return baseLayout({
    title: renderStreakMilestoneSubject(input.badgeKey),
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:linear-gradient(135deg,#EEF2FF,#FCE7F3);border-radius:16px;border:1px solid #E0E7FF;">
        <tr>
          <td align="center" style="padding:32px 24px;">
            <div style="font-size:48px;font-weight:800;line-height:1;color:#4338CA;font-variant-numeric:tabular-nums;">
              ${days}
            </div>
            <div style="margin-top:6px;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;">
              dias seguidos
            </div>
            <div style="margin-top:18px;font-size:18px;font-weight:700;color:#0F172A;">
              ${safeTitle}
            </div>
            <div style="margin-top:8px;font-size:14px;line-height:1.55;color:#475569;">
              ${safeSubtitle}
            </div>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Tu badge ya esta en tu perfil. Sigue asi: cada dia cuenta.
      </p>
    `,
  });
}
