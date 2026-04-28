// F14.F.11 Sprint 10 BIBLIA Tarea 10.3 — Beta outreach initial invite template.
// STUB ADR-018 H2 — activable cuando founder L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE.
// ADR-050 reglas inviolables: pill buttons border-radius 9999px,
// brand gradient `linear-gradient(90deg, #6366F1, #EC4899)` solo principal,
// cero emoji, founder voice warm + non-pushy.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderBetaInviteInitialInput {
  readonly name: string;
  readonly city: string;
  readonly founderName?: string | undefined;
  readonly role?: string | undefined;
}

export function renderBetaInviteInitialSubject(name: string): string {
  return `Invitacion privada a la beta de DMX Studio, ${escapeHtml(name)}`;
}

export const BETA_INVITE_INITIAL_SUBJECT_FALLBACK = 'Invitacion privada a la beta de DMX Studio';

export function renderBetaInviteInitialHtml(input: RenderBetaInviteInitialInput): string {
  const founderName = input.founderName?.trim() || 'Manu';
  const safeName = escapeHtml(input.name);
  const safeCity = escapeHtml(input.city);
  const safeFounder = escapeHtml(founderName);
  const roleClause = input.role
    ? `${escapeHtml(input.role)} en ${safeCity}`
    : `tu perfil en ${safeCity}`;

  return baseLayout({
    title: renderBetaInviteInitialSubject(input.name),
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">Hola ${safeName},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Soy ${safeFounder}, founder de Desarrollos MX. Te escribo personalmente porque
        ${roleClause} es exactamente el perfil que estamos buscando para la primera ola
        de DMX Studio.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        DMX Studio es un estudio de video inmobiliario con IA: voice clone propio,
        Director IA que arma el guion desde 10 fotos, virtual staging, drone simulation,
        y una galeria publica con tu marca. Todo en un solo flujo, sin editor, sin locutor,
        sin estudio.
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#0F172A;">
        Lo que te ofrezco si entras como beta privada:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>Acceso completo gratis durante 4 semanas.</li>
        <li>Soporte directo conmigo por WhatsApp para cualquier duda.</li>
        <li>50% de descuento de por vida cuando elijas plan al salir del beta.</li>
        <li>Tu feedback prioriza el roadmap real, no encuestas.</li>
      </ul>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#0F172A;">
        A cambio te pido tres cosas concretas:
      </p>
      <ol style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>Subir al menos 3 propiedades reales durante el mes.</li>
        <li>30 minutos de llamada al final para escuchar que funciono y que no.</li>
        <li>Honestidad. Si no te sirve, lo dices y cierro tu cuenta sin friccion.</li>
      </ol>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#0F172A;">
        Si te interesa, responde este correo con un si. Te mando el link de acceso
        y la guia de onboarding el mismo dia. Si no es para ti, tambien esta bien,
        respondeme "no" y no te vuelvo a escribir sobre esto.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:linear-gradient(90deg, #6366F1, #EC4899);border-radius:9999px;">
            <a href="mailto:manu@desarrollosmx.com?subject=Si%20a%20la%20beta%20DMX%20Studio"
               style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none;border-radius:9999px;">
              Responder con un si
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">
        ${safeFounder}<br />
        Manuel Acosta<br />
        Founder, Desarrollos MX
      </p>
    `,
  });
}
