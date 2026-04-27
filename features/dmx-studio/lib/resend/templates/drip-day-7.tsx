// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Drip day-7: case study placeholder.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderDripDay7Input {
  readonly name?: string | undefined;
}

export const DRIP_DAY_7_SUBJECT = 'Caso de exito: como Studio cambia el juego';

export function renderDripDay7Html(input: RenderDripDay7Input): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  return baseLayout({
    title: DRIP_DAY_7_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Caso real (anonimizado para proteccion de datos):
      </p>
      <h3 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#0F172A;">Asesora en Polanco, 18 propiedades activas</h3>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Antes: 4 horas por video editado a mano. 2 a 3 videos por mes. Costo
        promedio por video con freelance: $1,200 MXN.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Despues con Studio: 12 minutos de trabajo activo por video. 18 videos
        este mes (uno por propiedad). Costo marginal por video: $40 MXN.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Resultado: tiempo en mercado bajo de 73 a 41 dias promedio. Tasa de
        primer-contacto a visita subio 38%.
      </p>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:#475569;">
        En 7 dias mas: aviso final cuando abramos cupos founders.
      </p>
    `,
  });
}
