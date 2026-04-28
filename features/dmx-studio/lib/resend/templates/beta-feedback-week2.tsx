// F14.F.11 Sprint 10 BIBLIA Tarea 10.3 — Beta outreach feedback Week 2 template.
// STUB ADR-018 H2 — activable L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE.
// ADR-050 pill buttons border-radius 9999px, brand gradient principal solo,
// cero emoji, founder voice warm + non-pushy + opt-out explicito.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderBetaFeedbackWeek2Input {
  readonly name: string;
  readonly surveyUrl: string;
  readonly calendlyUrl: string;
  readonly founderName?: string | undefined;
  readonly founderWhatsapp?: string | undefined;
}

export function renderBetaFeedbackWeek2Subject(name: string): string {
  return `Cierre del beta — 5 minutos de feedback, ${escapeHtml(name)}`;
}

export const BETA_FEEDBACK_WEEK2_SUBJECT_FALLBACK = 'Cierre del beta — 5 minutos de feedback';

export function renderBetaFeedbackWeek2Html(input: RenderBetaFeedbackWeek2Input): string {
  const founderName = input.founderName?.trim() || 'Manu';
  const whatsapp = input.founderWhatsapp?.trim() || '+52 55 XXXX XXXX';
  const safeName = escapeHtml(input.name);
  const safeSurvey = escapeHtml(input.surveyUrl);
  const safeCalendly = escapeHtml(input.calendlyUrl);
  const safeFounder = escapeHtml(founderName);
  const safeWhatsapp = escapeHtml(whatsapp);

  return baseLayout({
    title: renderBetaFeedbackWeek2Subject(input.name),
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">Hola ${safeName},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Llegamos al cierre de tu mes en el beta. Gracias por el tiempo que le dedicaste.
        Sin ti, este producto se construye a ciegas.
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#0F172A;">
        Tres formas de cerrar, elige la que te quede mejor:
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="background:linear-gradient(90deg, #6366F1, #EC4899);border-radius:9999px;">
            <a href="${safeSurvey}"
               style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none;border-radius:9999px;">
              Survey corto 5 minutos
            </a>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border:1px solid #6366F1;border-radius:9999px;background:#FFFFFF;">
            <a href="${safeCalendly}"
               style="display:inline-block;padding:10px 24px;color:#6366F1;font-weight:600;font-size:14px;text-decoration:none;border-radius:9999px;">
              Llamada 30 minutos
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        O un audio de WhatsApp sin script, lo que se te ocurra: ${safeWhatsapp}
      </p>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Lo que mas me sirve: que fallo, que te sorprendio, y si lo recomendarias
        a un colega, y por que (o por que no).
      </p>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        Sobre tu cuenta: queda activa con el 50% lifetime discount como acordamos.
        Si decides no continuar, cero friccion. Me dices y la cierro.
      </p>

      <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#475569;">
        Gracias de verdad.
      </p>

      <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">${safeFounder}</p>
    `,
  });
}
