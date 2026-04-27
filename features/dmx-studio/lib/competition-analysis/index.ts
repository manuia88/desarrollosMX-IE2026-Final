// F14.F.4 Sprint 3 UPGRADE 6 — Compite vs vecinos via Claude Director.
//
// Llamada al Director extendido con system prompt para 3 hooks distintivos
// asumiendo listings similares en zona. Cost ~$0.05 incluido en flow video gen
// (no costo extra). Mock-friendly via injectable client.

import type { PropertyData } from '@/features/dmx-studio/lib/claude-director';
import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface CompetitionInsight {
  readonly distinctiveHooks: ReadonlyArray<string>;
  readonly similarListingsAssumed: number;
  readonly costUsd: number;
  readonly aiModel: string;
}

const COMPETITION_SYSTEM_PROMPT = `Eres un estratega de marketing inmobiliario LATAM. Dado un listing de propiedad, asume que existen 5-15 listings similares en la misma zona compitiendo por el mismo comprador. Tu tarea: producir 3 hooks distintivos que diferencien este listing de los vecinos. Output JSON estricto:
{"distinctiveHooks": ["hook 1", "hook 2", "hook 3"], "similarListingsAssumed": 8}
Reglas:
- 3 hooks exactos, max 80 chars c/u, en es-MX, cero emoji.
- Cada hook destaca un atributo distintivo (vista, amenidad, distribución, ubicación específica).
- similarListingsAssumed: estimación entera 5-15 según densidad zonal típica.
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

const COMPETITION_MODEL = 'claude-sonnet-4-5';
const INPUT_COST_PER_MTOK = 3;
const OUTPUT_COST_PER_MTOK = 15;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_MTOK + outputTokens * OUTPUT_COST_PER_MTOK) / 1_000_000;
}

export async function analyzeCompetition(
  propertyData: PropertyData,
  client?: DirectorClientLike,
): Promise<CompetitionInsight> {
  const llm = client ?? (getDirectorClient() as unknown as DirectorClientLike);
  const userPrompt = `Datos listing:
- precio_usd: ${propertyData.priceUsd}
- area_m2: ${propertyData.areaM2}
- recamaras: ${propertyData.bedrooms}
- banos: ${propertyData.bathrooms}
- zona: ${propertyData.zone}
- ciudad: ${propertyData.city}
- pais: ${propertyData.country}

Genera 3 hooks distintivos vs vecinos.`;

  try {
    const response = await llm.messages.create({
      model: COMPETITION_MODEL,
      max_tokens: 600,
      system: COMPETITION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock?.text ?? '';
    const parsed = JSON.parse(text) as {
      distinctiveHooks?: string[];
      similarListingsAssumed?: number;
    };
    const hooks = (parsed.distinctiveHooks ?? []).slice(0, 3);
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    return {
      distinctiveHooks: hooks,
      similarListingsAssumed: parsed.similarListingsAssumed ?? 8,
      costUsd: estimateCost(inputTokens, outputTokens),
      aiModel: COMPETITION_MODEL,
    };
  } catch (error) {
    sentry.captureException(error, { tags: { feature: 'studio-competition-analysis' } });
    throw error;
  }
}
