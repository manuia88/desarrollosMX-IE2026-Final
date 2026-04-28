// FASE 15.A.4 (GC-81) — Site Selection AI con CF.3 Atlas constellations
// Claude Sonnet function-calling. Tools: data observada (zone_scores, ghost_zones_ranking,
// constellation graph, demographics) + Atlas CF.3 (constellation context, ghost rank, ecosystem delta).
// STUB ADR-018: si ANTHROPIC_API_KEY no está set en env, retorna placeholder estructurado
// con isPlaceholder=true para que UI marque disclosure flag.

import Anthropic from '@anthropic-ai/sdk';
import type { SiteSelectionResultZone } from '@/features/developer/schemas';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const SITE_SELECTION_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 4096;

export type SiteSelectionAIInput = {
  query: string;
  userId: string;
  desarrolladoraId: string;
};

export type SiteSelectionListing = {
  listingId: string | null;
  title: string;
  pricePerM2Mxn: number | null;
  areaM2: number | null;
};

export type SiteSelectionAIOutput = {
  parsedIntent: Record<string, unknown>;
  zones: ReadonlyArray<SiteSelectionResultZone>;
  listings: ReadonlyArray<SiteSelectionListing>;
  narrative: string;
  costUsd: number;
  isPlaceholder: boolean;
};

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const SYSTEM_PROMPT_ES_MX = `Eres un asesor de Site Selection para desarrolladoras inmobiliarias en México.
Recibirás una query en lenguaje natural describiendo el perfil de proyecto (unidades, segmento, ciudad, presupuesto, absorción objetivo).
Tu trabajo: identificar las top 5 zonas (colonias) más adecuadas usando datos observados de zone_scores, ghost_zones_ranking y constellation graph.

Reglas:
- Cita SIEMPRE al menos una métrica observada por zona (score, rank, ghost_score, etc).
- Diferencia data observada vs inferencias propias en el rationale.
- Output JSON estructurado: parsedIntent + zones (5) + narrative (3-5 párrafos).
- Cero claims sin sustento. Si falta data, marca el zoneId como null.
- Lenguaje es-MX, profesional, conciso.`;

const TOOLS_SPEC: Anthropic.Tool[] = [
  {
    name: 'getZoneScores',
    description: 'Obtiene scores observados (momentum, walkability, safety) por zona/ciudad',
    input_schema: {
      type: 'object',
      properties: {
        ciudad: { type: 'string', description: 'Ciudad target (ej. CDMX, Monterrey)' },
        limit: { type: 'number', default: 20 },
      },
      required: ['ciudad'],
    },
  },
  {
    name: 'getGhostZoneRanking',
    description:
      'Ranking ghost zones (high search/press signal, low listing supply) por ciudad. CF.3 Atlas tool.',
    input_schema: {
      type: 'object',
      properties: {
        ciudad: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
      required: ['ciudad'],
    },
  },
  {
    name: 'getConstellationContext',
    description:
      'Contexto constellation: cluster + zonas vecinas conectadas por edges. CF.3 Atlas tool.',
    input_schema: {
      type: 'object',
      properties: {
        zoneId: { type: 'string', description: 'UUID zona a expandir' },
      },
      required: ['zoneId'],
    },
  },
  {
    name: 'getEcosystemDelta',
    description: 'Diff walkability/safety/momentum entre dos zonas. CF.3 Atlas tool.',
    input_schema: {
      type: 'object',
      properties: {
        zoneA: { type: 'string' },
        zoneB: { type: 'string' },
      },
      required: ['zoneA', 'zoneB'],
    },
  },
];

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function buildToolHandlers(): Record<string, ToolHandler> {
  const supabase = createAdminClient();
  return {
    getZoneScores: async (args) => {
      const ciudad = String(args.ciudad ?? '');
      const limit = Math.min(Number(args.limit ?? 20), 50);
      const { data, error } = await supabase
        .from('zone_scores')
        .select('zone_id, score_type, score_value, period_date')
        .order('period_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { ciudad, rows: data ?? [] };
    },
    getGhostZoneRanking: async (args) => {
      const limit = Math.min(Number(args.limit ?? 10), 20);
      const { data, error } = await supabase
        .from('ghost_zones_ranking')
        .select('colonia_id, score_total, ghost_score, rank, period_date, transition_probability')
        .order('rank', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return { rows: data ?? [] };
    },
    getConstellationContext: async (args) => {
      const zoneId = String(args.zoneId ?? '');
      if (!zoneId) return { neighbors: [], cluster: null };
      const [{ data: cluster }, { data: edges }] = await Promise.all([
        supabase
          .from('zone_constellation_clusters')
          .select('cluster_id, period_date')
          .eq('zone_id', zoneId)
          .order('period_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('zone_constellations_edges')
          .select('source_colonia_id, target_colonia_id, edge_weight, edge_types')
          .or(`source_colonia_id.eq.${zoneId},target_colonia_id.eq.${zoneId}`)
          .order('edge_weight', { ascending: false })
          .limit(10),
      ]);
      return { cluster, neighbors: edges ?? [] };
    },
    getEcosystemDelta: async (args) => {
      const zoneA = String(args.zoneA ?? '');
      const zoneB = String(args.zoneB ?? '');
      const { data, error } = await supabase
        .from('zone_scores')
        .select('zone_id, score_type, score_value')
        .in('zone_id', [zoneA, zoneB]);
      if (error) throw error;
      return { zoneA, zoneB, rows: data ?? [] };
    },
  };
}

function placeholderOutput(query: string): SiteSelectionAIOutput {
  return {
    parsedIntent: { raw_query: query, status: 'placeholder' },
    zones: [
      {
        zoneId: null,
        colonia: 'Roma Norte',
        ciudad: 'CDMX',
        fitScore: 78,
        rationale:
          'Alta densidad walkability + momentum sostenido en últimos 90 días. Datos observables aún no integrados al engine real.',
        lat: 19.4192,
        lng: -99.1654,
      },
      {
        zoneId: null,
        colonia: 'Condesa',
        ciudad: 'CDMX',
        fitScore: 74,
        rationale:
          'Constellation cluster top-tier conectado a Roma Norte y Juárez por edges altos.',
        lat: 19.4123,
        lng: -99.1759,
      },
    ],
    listings: [],
    narrative:
      'Site Selection AI engine pendiente de activación con ANTHROPIC_API_KEY + tools tuning. ' +
      'Mientras tanto este resultado es ilustrativo (placeholder ADR-018) y muestra la estructura ' +
      'que recibirás cuando se complete la integración. Los rationales reales citarán datos observados ' +
      'de zone_scores y ghost_zones_ranking con fechas y deltas exactos.',
    costUsd: 0,
    isPlaceholder: true,
  };
}

export async function runSiteSelectionAI(
  input: SiteSelectionAIInput,
): Promise<SiteSelectionAIOutput> {
  const client = getClient();
  if (!client) {
    return placeholderOutput(input.query);
  }

  try {
    const handlers = buildToolHandlers();
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: input.query }];

    let totalCostUsd = 0;
    let lastResponse: Anthropic.Message | null = null;

    for (let iter = 0; iter < 4; iter++) {
      const response = await client.messages.create({
        model: SITE_SELECTION_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT_ES_MX,
        tools: TOOLS_SPEC,
        messages,
      });
      lastResponse = response;
      const usage = response.usage;
      totalCostUsd += (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000;

      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      if (toolUseBlocks.length === 0) break;

      messages.push({ role: 'assistant', content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUseBlocks) {
        const handler = handlers[tu.name];
        try {
          const result = handler
            ? await handler(tu.input as Record<string, unknown>)
            : { error: 'unknown_tool' };
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          });
        } catch (e) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
            is_error: true,
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }

    const textBlocks =
      lastResponse?.content.filter((b): b is Anthropic.TextBlock => b.type === 'text') ?? [];
    const aggregated = textBlocks.map((b) => b.text).join('\n');

    const parsed = tryParseStructuredOutput(aggregated);
    return {
      parsedIntent: parsed.parsedIntent ?? { raw_query: input.query },
      zones: parsed.zones ?? [],
      listings: parsed.listings ?? [],
      narrative: parsed.narrative ?? aggregated.slice(0, 2000),
      costUsd: Number(totalCostUsd.toFixed(6)),
      isPlaceholder: false,
    };
  } catch (e) {
    sentry.captureException(e, { tags: { feature: 'site-selection-ai' } });
    return placeholderOutput(input.query);
  }
}

type ParsedShape = {
  parsedIntent?: Record<string, unknown>;
  zones?: SiteSelectionResultZone[];
  listings?: SiteSelectionListing[];
  narrative?: string;
};

function tryParseStructuredOutput(text: string): ParsedShape {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = fenceMatch?.[1] ?? text;
  try {
    const obj = JSON.parse(jsonStr) as ParsedShape;
    if (obj && typeof obj === 'object') return obj;
    return {};
  } catch {
    return {};
  }
}
