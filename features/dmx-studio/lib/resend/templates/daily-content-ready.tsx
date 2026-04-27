// F14.F.5 Sprint 4 — DMX Studio Resend template "Tu contenido de hoy esta listo".
// Notifies the user that today's calendar entry has been generated and is ready
// to publish. Plain string template (no JSX runtime) following welcome-studio canon.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderDailyContentReadyInput {
  readonly name?: string | null | undefined;
  readonly calendarEntryType: string;
  readonly calendarEntryTitle: string;
  readonly calendarEntryUrl: string;
}

export const DAILY_CONTENT_READY_SUBJECT = 'Tu contenido de hoy esta listo';

export function renderDailyContentReadyHtml(input: RenderDailyContentReadyInput): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  const safeType = escapeHtml(input.calendarEntryType);
  const safeTitle = escapeHtml(input.calendarEntryTitle);
  const safeUrl = escapeHtml(input.calendarEntryUrl);

  return baseLayout({
    title: DAILY_CONTENT_READY_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Tu contenido programado para hoy ya esta generado y listo para publicar:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
        <tr>
          <td style="padding:18px 20px;">
            <div style="font-size:12px;line-height:1.4;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">${safeType}</div>
            <div style="font-size:16px;font-weight:700;line-height:1.4;color:#0F172A;">${safeTitle}</div>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:9999px;background:linear-gradient(90deg,#6366F1,#EC4899);color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">
          Ver y publicar
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">
        Si prefieres no recibir estos avisos, puedes ajustarlo desde tus preferencias de notificaciones en DMX Studio.
      </p>
    `,
  });
}
