// F14.F.11 Sprint 10 BIBLIA Tarea 10.3 — Beta outreach onboarding Day 1 template.
// STUB ADR-018 H2 — activable L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE.
// ADR-050 pill buttons border-radius 9999px, brand gradient principal solo,
// cero emoji, founder voice warm + step-by-step.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderBetaOnboardingDay1Input {
  readonly name: string;
  readonly city?: string | undefined;
  readonly checkoutUrl: string;
  readonly onboardingGuideUrl: string;
  readonly founderName?: string | undefined;
  readonly founderWhatsapp?: string | undefined;
}

export const BETA_ONBOARDING_DAY1_SUBJECT =
  'Bienvenido a la beta de DMX Studio — guia de los primeros 3 dias';

export function renderBetaOnboardingDay1Html(input: RenderBetaOnboardingDay1Input): string {
  const founderName = input.founderName?.trim() || 'Manu';
  const whatsapp = input.founderWhatsapp?.trim() || '+52 55 XXXX XXXX';
  const safeName = escapeHtml(input.name);
  const safeCheckout = escapeHtml(input.checkoutUrl);
  const safeGuide = escapeHtml(input.onboardingGuideUrl);
  const safeFounder = escapeHtml(founderName);
  const safeWhatsapp = escapeHtml(whatsapp);

  return baseLayout({
    title: BETA_ONBOARDING_DAY1_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">Hola ${safeName},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        Gracias por entrar. Aqui va la guia corta para que empieces hoy mismo.
      </p>

      <h3 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#0F172A;">Dia 1 — Configurar cuenta</h3>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>Click el boton de abajo para activar tu cuenta (no se cobra durante el beta).</li>
        <li>Sube 5 fotos de una propiedad real para activar tu primer flujo.</li>
        <li>Opcional pero recomendado: graba 60 segundos de tu voz para clonarla.</li>
      </ul>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:linear-gradient(90deg, #6366F1, #EC4899);border-radius:9999px;">
            <a href="${safeCheckout}"
               style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none;border-radius:9999px;">
              Activar mi cuenta beta
            </a>
          </td>
        </tr>
      </table>

      <h3 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#0F172A;">Dia 2 — Primer video</h3>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>Abre Director IA con la propiedad que subiste.</li>
        <li>Acepta el guion o ajusta una linea si quieres.</li>
        <li>Descarga el MP4. Promedio: 12 minutos de trabajo activo.</li>
      </ul>

      <h3 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#0F172A;">Dia 3 — Tu primera publicacion</h3>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>Sube el video a Instagram, WhatsApp Status o tu portal.</li>
        <li>Mandame el link por WhatsApp ${safeWhatsapp} para ver como quedo.</li>
      </ul>

      <p style="margin:24px 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Guia completa paso a paso:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="border:1px solid #6366F1;border-radius:9999px;background:#FFFFFF;">
            <a href="${safeGuide}"
               style="display:inline-block;padding:10px 24px;color:#6366F1;font-weight:600;font-size:14px;text-decoration:none;border-radius:9999px;">
              Ver guia completa
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#475569;">
        Si te traba algo, responde este correo o WhatsApp directo. Respuesta el mismo dia.
      </p>

      <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">${safeFounder}</p>
    `,
  });
}
