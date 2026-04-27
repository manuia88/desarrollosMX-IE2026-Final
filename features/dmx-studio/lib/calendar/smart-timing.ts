// F14.F.5 Sprint 4 — UPGRADE 4 DIRECTO: Smart timing optimization per platform.
// Hardcoded data canon basado en investigacion social media engagement (Sprout Social,
// Hootsuite, Buffer 2025 reports). Hour returned en hora local del asesor (zona MX).
//
// STUB ADR-018 — activar reemplazo ML H2:
// Cuando exista L-NEW-STUDIO-SMART-TIMING-ML feature flag activo, reemplazar tabla
// hardcoded por modelo Bayesian per (platform × dayOfWeek × asesor_id) entrenado sobre
// studio_video_projects.published_at + analytics CTR. data-stub-activar marker abajo.

import { type OptimalTiming, OptimalTimingSchema } from './types';

export type SmartTimingPlatform = 'instagram' | 'tiktok' | 'facebook' | 'wa_status' | 'linkedin';

// dayOfWeek: 0=domingo, 1=lunes, ..., 6=sabado.
// hour: 0..23, hora local MX.
// STUB — activar L-NEW-STUDIO-SMART-TIMING-ML H2 (Bayesian model entrenado por asesor).
const SMART_TIMING_TABLE: Record<
  SmartTimingPlatform,
  ReadonlyArray<{ dayOfWeek: number; hour: number; reason: string }>
> = {
  instagram: [
    { dayOfWeek: 0, hour: 11, reason: 'Domingo brunch: scroll relajado, alto engagement reels.' },
    { dayOfWeek: 1, hour: 19, reason: 'Lunes 7pm: vuelta a casa, peak feed Instagram.' },
    { dayOfWeek: 2, hour: 12, reason: 'Martes mediodia: lunch break, picos engagement IG.' },
    { dayOfWeek: 3, hour: 19, reason: 'Miercoles 7pm: ventana media semana mejor CTR.' },
    { dayOfWeek: 4, hour: 12, reason: 'Jueves mediodia: lunch break consistente con martes.' },
    {
      dayOfWeek: 5,
      hour: 14,
      reason: 'Viernes tarde: planeacion fin de semana, IG real estate hot.',
    },
    { dayOfWeek: 6, hour: 10, reason: 'Sabado matutino: brunch tour de propiedades.' },
  ],
  tiktok: [
    { dayOfWeek: 0, hour: 21, reason: 'Domingo noche: peak global TikTok consumption.' },
    { dayOfWeek: 1, hour: 21, reason: 'Lunes 9pm: ventana noche post-cena.' },
    { dayOfWeek: 2, hour: 9, reason: 'Martes 9am: commute matutino TikTok.' },
    { dayOfWeek: 3, hour: 19, reason: 'Miercoles 7pm: pre-cena scroll TikTok algoritmo.' },
    { dayOfWeek: 4, hour: 12, reason: 'Jueves mediodia: lunch peak TikTok.' },
    { dayOfWeek: 5, hour: 17, reason: 'Viernes 5pm: salida oficina, scroll viral.' },
    { dayOfWeek: 6, hour: 11, reason: 'Sabado mediamañana: tiempo libre, exploracion TikTok.' },
  ],
  facebook: [
    { dayOfWeek: 0, hour: 13, reason: 'Domingo tarde: familia en casa, FB activo.' },
    { dayOfWeek: 1, hour: 13, reason: 'Lunes 1pm: hora del lunch FB demo 35-55.' },
    { dayOfWeek: 2, hour: 13, reason: 'Martes 1pm: peak FB engagement weekday.' },
    { dayOfWeek: 3, hour: 13, reason: 'Miercoles 1pm: ventana lunch consistente.' },
    { dayOfWeek: 4, hour: 13, reason: 'Jueves 1pm: lunch FB pre-fin de semana.' },
    { dayOfWeek: 5, hour: 11, reason: 'Viernes mediamañana: planeacion fin de semana.' },
    { dayOfWeek: 6, hour: 12, reason: 'Sabado mediodia: tiempo libre, FB casual.' },
  ],
  wa_status: [
    { dayOfWeek: 0, hour: 18, reason: 'Domingo 6pm: peak WhatsApp Status views fin de semana.' },
    { dayOfWeek: 1, hour: 8, reason: 'Lunes 8am: revision matutina WhatsApp.' },
    { dayOfWeek: 2, hour: 20, reason: 'Martes 8pm: noche WA peak engagement.' },
    { dayOfWeek: 3, hour: 8, reason: 'Miercoles 8am: matutino WA Status views.' },
    { dayOfWeek: 4, hour: 20, reason: 'Jueves 8pm: noche WA tipo momento intimo.' },
    { dayOfWeek: 5, hour: 18, reason: 'Viernes 6pm: salida oficina, WA peak.' },
    { dayOfWeek: 6, hour: 11, reason: 'Sabado mediamañana: tiempo libre WA Status.' },
  ],
  linkedin: [
    { dayOfWeek: 0, hour: 10, reason: 'Domingo planeacion semana: B2B real estate agents.' },
    { dayOfWeek: 1, hour: 9, reason: 'Lunes 9am: arranque B2B, LinkedIn matutino.' },
    { dayOfWeek: 2, hour: 10, reason: 'Martes 10am: peak LinkedIn engagement weekday.' },
    { dayOfWeek: 3, hour: 12, reason: 'Miercoles mediodia: lunch B2B consumo LinkedIn.' },
    { dayOfWeek: 4, hour: 10, reason: 'Jueves 10am: ventana B2B media mañana.' },
    { dayOfWeek: 5, hour: 14, reason: 'Viernes 2pm: relajado B2B, LinkedIn casual.' },
    { dayOfWeek: 6, hour: 11, reason: 'Sabado mediamañana: B2B baja pero real estate persiste.' },
  ],
};

export function getOptimalTiming(platform: SmartTimingPlatform, dayOfWeek: number): OptimalTiming {
  const normalizedDay = ((dayOfWeek % 7) + 7) % 7;
  const table = SMART_TIMING_TABLE[platform];
  const slot = table.find((s) => s.dayOfWeek === normalizedDay);
  if (!slot) {
    // data-stub-activar — fallback para defensive coding (nunca debe golpear).
    return OptimalTimingSchema.parse({
      hour: 12,
      reason: 'Mediodia default: hora segura cross-platform.',
    });
  }
  return OptimalTimingSchema.parse({ hour: slot.hour, reason: slot.reason });
}
