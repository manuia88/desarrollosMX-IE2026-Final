// F14.F.4 Sprint 3 — Claude Director copy pack 5 outputs (Tarea 3.4).
//
// 5 outputs: Caption Instagram + Mensaje WhatsApp + Descripción Portal +
// Guion Voz + Título Video. Single Claude call genera todos. WhatsApp
// includes deep link wa.me/[phone]?text= (UPGRADE 4).

import type { PropertyData } from '@/features/dmx-studio/lib/claude-director';
import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface CompleteCopyPack {
  readonly captionInstagram: string;
  readonly hashtags: ReadonlyArray<string>;
  readonly messageWhatsapp: string;
  readonly whatsappDeepLink: string | null;
  readonly descriptionPortal: string;
  readonly narrationScript: string;
  readonly videoTitle: string;
  readonly costUsd: number;
  readonly aiModel: string;
}

export interface BrandKitInput {
  readonly displayName: string | null;
  readonly contactPhone: string | null;
  readonly tone: string;
}

const COPY_PACK_MODEL = 'claude-sonnet-4-5';
const INPUT_COST_PER_MTOK = 3;
const OUTPUT_COST_PER_MTOK = 15;

const COPY_PACK_SYSTEM_PROMPT = `Eres un copywriter inmobiliario LATAM experto en es-MX. Genera un Copy Pack completo para un listing de propiedad. Output JSON estricto:
{
  "captionInstagram": "texto caption max 2200 chars con hashtags inline",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "messageWhatsapp": "texto mensaje WA pre-formateado",
  "descriptionPortal": "descripción SEO portal MX max 1500 chars",
  "narrationScript": "guion voz 60-120 palabras",
  "videoTitle": "título max 80 chars con hook"
}
Reglas:
- captionInstagram max 2200 chars, cero emoji canon DMX, hashtags al final.
- hashtags 8-12 relevantes (zona + tipo + amenidades + ciudad).
- messageWhatsapp tono cercano profesional, max 600 chars, NO incluyas link aquí (UI lo agrega).
- descriptionPortal SEO MX (keywords zona + tipo + amenidades), max 1500 chars.
- narrationScript 60-120 palabras es-MX conversacional, ~30 segundos lectura.
- videoTitle max 80 chars con hook (precio, vista, exclusividad).
- Cero emoji. NO inventes datos no provistos. Marca [DATO_FALTANTE] si falta info crítica.
- Responde EXCLUSIVAMENTE con el JSON.`;

interface DirectorClientLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
    }) => Promise<{
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_MTOK + outputTokens * OUTPUT_COST_PER_MTOK) / 1_000_000;
}

function buildWhatsappDeepLink(message: string, phone: string | null): string | null {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 7) return null;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export async function generateCompleteCopyPack(
  propertyData: PropertyData,
  brandKit: BrandKitInput,
  client?: DirectorClientLike,
): Promise<CompleteCopyPack> {
  const llm = client ?? (getDirectorClient() as unknown as DirectorClientLike);
  const userPrompt = `Datos listing:
- precio_usd: ${propertyData.priceUsd}
- area_m2: ${propertyData.areaM2}
- recamaras: ${propertyData.bedrooms}
- banos: ${propertyData.bathrooms}
- zona: ${propertyData.zone}
- ciudad: ${propertyData.city}
- pais: ${propertyData.country}

Brand kit asesor:
- nombre: ${brandKit.displayName ?? '[ASESOR]'}
- tono: ${brandKit.tone}

Genera Copy Pack 5 outputs.`;

  try {
    const response = await llm.messages.create({
      model: COPY_PACK_MODEL,
      max_tokens: 4000,
      system: COPY_PACK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock?.text ?? '';
    const parsed = JSON.parse(text) as {
      captionInstagram?: string;
      hashtags?: string[];
      messageWhatsapp?: string;
      descriptionPortal?: string;
      narrationScript?: string;
      videoTitle?: string;
    };

    const messageWhatsapp = parsed.messageWhatsapp ?? '';
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    return {
      captionInstagram: parsed.captionInstagram ?? '',
      hashtags: parsed.hashtags ?? [],
      messageWhatsapp,
      whatsappDeepLink: buildWhatsappDeepLink(messageWhatsapp, brandKit.contactPhone),
      descriptionPortal: parsed.descriptionPortal ?? '',
      narrationScript: parsed.narrationScript ?? '',
      videoTitle: parsed.videoTitle ?? '',
      costUsd: estimateCost(inputTokens, outputTokens),
      aiModel: COPY_PACK_MODEL,
    };
  } catch (error) {
    sentry.captureException(error, { tags: { feature: 'studio-copy-pack' } });
    throw error;
  }
}
