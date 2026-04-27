// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Drip day-3: feature preview voice clone + Director IA.

import { baseLayout, escapeHtml } from './welcome-studio';

export interface RenderDripDay3Input {
  readonly name?: string | undefined;
}

export const DRIP_DAY_3_SUBJECT = 'Conoce las features de DMX Studio';

export function renderDripDay3Html(input: RenderDripDay3Input): string {
  const greeting = input.name ? `Hola ${escapeHtml(input.name)},` : 'Hola,';
  return baseLayout({
    title: DRIP_DAY_3_SUBJECT,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Hoy un vistazo a dos features que cambian la economia del video inmobiliario:
      </p>
      <h3 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#0F172A;">Voice clone propio</h3>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Grabas una vez 60 segundos de tu voz. Despues, cualquier video usa tu voz
        narrando — en espanol o en ingles, con el tono que elijas.
        Sin entrar al estudio. Sin pagar locutor.
      </p>
      <h3 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#0F172A;">Director IA</h3>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0F172A;">
        Subes 10 fotos. Director IA analiza la propiedad, redacta un guion
        narrativo orientado al comprador objetivo, define cortes y musica,
        y entrega un MP4 de 60 a 90 segundos listo para publicar.
      </p>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:#475569;">
        En 4 dias mas: caso real con numeros antes y despues.
      </p>
    `,
  });
}
