// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Welcome email template (waitlist signup). Plain string template — zero JSX
// runtime dependency, zero emojis, accessible HTML.

export interface RenderWelcomeStudioInput {
  readonly name?: string | undefined;
  readonly foundersCohortEligible: boolean;
  readonly position?: number | null | undefined;
}

export const WELCOME_STUDIO_SUBJECT = 'Bienvenido a DMX Studio waitlist';

export function renderWelcomeStudioHtml(input: RenderWelcomeStudioInput): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';

  const foundersBlock = input.foundersCohortEligible
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
         <strong>Founders Cohort confirmado.</strong>
         Eres uno de los primeros 50 en la lista${
           typeof input.position === 'number' ? ` (posición #${input.position})` : ''
         }. Recibirás early access + 50% descuento de por vida cuando abramos cupos.
       </p>`
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
         Estás en la lista de espera. Te avisaremos en cuanto liberemos cupos.
       </p>`;

  return baseLayout({
    title: WELCOME_STUDIO_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Gracias por sumarte a DMX Studio. Estamos construyendo el primer estudio
        de video inmobiliario con IA: voice clone, Director IA, virtual staging
        y galerias publicas — todo en un solo flujo.
      </p>
      ${foundersBlock}
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Que sigue:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>En 3 dias te enviaremos un recorrido por las features clave.</li>
        <li>En 1 semana, un caso de estudio real.</li>
        <li>En 2 semanas, tu lugar reservado en cuanto abramos.</li>
      </ul>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">
        Si no esperabas este correo, puedes ignorarlo y no te volveremos a contactar.
      </p>
    `,
  });
}

// ---------------- shared layout ----------------

interface BaseLayoutInput {
  readonly title: string;
  readonly bodyHtml: string;
}

export function baseLayout(input: BaseLayoutInput): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
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
                ${input.bodyHtml}
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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
