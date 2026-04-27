// F14.F.4 Sprint 3 UPGRADE 3 — 3 tonos variations per copy output.
//
// Single Claude call genera 3 tonos (formal/cercano/aspiracional) en un
// output. Cost ~$0.05 vs $0.15 si separate calls. Asesor selecciona favorita.

import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface ThreeToneVariations {
  readonly formal: string;
  readonly cercano: string;
  readonly aspiracional: string;
  readonly costUsd: number;
  readonly aiModel: string;
}

const VARIATIONS_MODEL = 'claude-sonnet-4-5';
const INPUT_COST_PER_MTOK = 3;
const OUTPUT_COST_PER_MTOK = 15;

const VARIATIONS_SYSTEM_PROMPT = `Eres un copywriter inmobiliario LATAM. Dado un texto original (caption / mensaje WA / descripción portal / guion / título), produces 3 variaciones tonales preservando el contenido informativo. Output JSON estricto:
{"formal": "version formal", "cercano": "version cercana", "aspiracional": "version aspiracional"}
Reglas:
- Cada variación preserva longitud aproximada (±20%) y datos del original.
- formal: tono profesional ejecutivo, vocabulario preciso.
- cercano: tono conversacional cálido, segunda persona "tú".
- aspiracional: tono evocador, lifestyle, futuro deseado.
- Cero emoji en TODAS las variaciones (canon DMX).
- es-MX como base lingüística.
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

export async function generateThreeVariations(
  originalContent: string,
  copyType: string,
  client?: DirectorClientLike,
): Promise<ThreeToneVariations> {
  const llm = client ?? (getDirectorClient() as unknown as DirectorClientLike);
  const userPrompt = `Tipo copy: ${copyType}

Texto original:
"""
${originalContent}
"""

Genera 3 variaciones tonales (formal / cercano / aspiracional).`;

  try {
    const response = await llm.messages.create({
      model: VARIATIONS_MODEL,
      max_tokens: 3000,
      system: VARIATIONS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock?.text ?? '';
    const parsed = JSON.parse(text) as {
      formal?: string;
      cercano?: string;
      aspiracional?: string;
    };
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    return {
      formal: parsed.formal ?? '',
      cercano: parsed.cercano ?? '',
      aspiracional: parsed.aspiracional ?? '',
      costUsd: estimateCost(inputTokens, outputTokens),
      aiModel: VARIATIONS_MODEL,
    };
  } catch (error) {
    sentry.captureException(error, { tags: { feature: 'studio-copy-variations' } });
    throw error;
  }
}
