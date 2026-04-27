// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Drip day-14: founders cohort urgency + final CTA.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderDripDay14Input {
  readonly name?: string | undefined;
  readonly position?: number | null | undefined;
  readonly foundersRemaining?: number | null | undefined;
}

export function renderDripDay14Subject(foundersRemaining?: number | null | undefined): string {
  const remaining =
    typeof foundersRemaining === 'number' && foundersRemaining > 0 ? foundersRemaining : 0;
  return `Quedan ${remaining} founders cohort spots — ultima oportunidad`;
}

export function renderDripDay14Html(input: RenderDripDay14Input): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  const remaining =
    typeof input.foundersRemaining === 'number' && input.foundersRemaining >= 0
      ? input.foundersRemaining
      : null;
  const position = typeof input.position === 'number' ? input.position : null;

  const countdownBlock =
    remaining !== null
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
           <strong>Quedan ${remaining} cupos</strong> en Founders Cohort. Una vez se llenen,
           el descuento de por vida cierra y el precio sube a tarifa estandar.
         </p>`
      : '';

  const positionBlock =
    position !== null
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
           Tu posicion en la lista: <strong>#${position}</strong>.
         </p>`
      : '';

  return baseLayout({
    title: renderDripDay14Subject(input.foundersRemaining ?? null),
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      ${countdownBlock}
      ${positionBlock}
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Cuando reclames tu lugar Founders, recibes:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#0F172A;">
        <li>50% de descuento de por vida sobre el plan que elijas.</li>
        <li>Acceso anticipado al beta Studio antes de lanzamiento publico.</li>
        <li>Galeria publica con tu marca personal incluida sin costo.</li>
      </ul>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:#475569;">
        Cuando abramos, recibiras un correo con tu link de checkout reservado por 72 horas.
      </p>
    `,
  });
}
