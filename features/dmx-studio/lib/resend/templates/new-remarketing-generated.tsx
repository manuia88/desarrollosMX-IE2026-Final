// F14.F.5 Sprint 4 — DMX Studio Resend template "Nuevo remarketing video generado".
// Notifies the user that a new remarketing variation has been derived from an
// existing project (different angle, hook or audience).

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderNewRemarketingGeneratedInput {
  readonly name?: string | null | undefined;
  readonly sourceProjectTitle: string;
  readonly newProjectUrl: string;
  readonly angle: string;
}

export const NEW_REMARKETING_GENERATED_SUBJECT = 'Nuevo remarketing video generado';

export function renderNewRemarketingGeneratedHtml(
  input: RenderNewRemarketingGeneratedInput,
): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  const safeSource = escapeHtml(input.sourceProjectTitle);
  const safeAngle = escapeHtml(input.angle);
  const safeUrl = escapeHtml(input.newProjectUrl);

  return baseLayout({
    title: NEW_REMARKETING_GENERATED_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Generamos una variante de remarketing a partir de tu proyecto
        <strong>${safeSource}</strong>, esta vez enfocada en un angulo diferente:
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#0F172A;">
        <span style="display:inline-block;padding:6px 12px;border-radius:9999px;background:#EEF2FF;color:#4338CA;font-size:13px;font-weight:600;">
          ${safeAngle}
        </span>
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:9999px;background:linear-gradient(90deg,#6366F1,#EC4899);color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">
          Ver el nuevo video
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">
        Cada propiedad tiene mas de un comprador objetivo. El remarketing IA te
        ayuda a llegar a cada uno con el mensaje correcto.
      </p>
    `,
  });
}
