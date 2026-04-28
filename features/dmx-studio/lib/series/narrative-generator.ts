// F14.F.9 Sprint 8 BIBLIA Tarea 8.1 — Generacion de arco narrativo via Claude Director.
// Reusa patron getDirectorClient() de features/dmx-studio/lib/claude-director.

import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface NarrativeArcEpisode {
  readonly episode_number: number;
  readonly phase:
    | 'planificacion'
    | 'construccion'
    | 'acabados'
    | 'amenidades'
    | 'entrega'
    | 'custom';
  readonly suggested_title: string;
  readonly suggested_duration_sec: number;
  readonly key_visuals: ReadonlyArray<string>;
}

export interface GenerateNarrativeArcOptions {
  readonly desarrolloId?: string;
  readonly title?: string;
}

export interface GenerateNarrativeArcResult {
  readonly arc: ReadonlyArray<NarrativeArcEpisode>;
  readonly costUsd: number;
  readonly aiGenerated: boolean;
}

const DEFAULT_PHASES_5: ReadonlyArray<NarrativeArcEpisode['phase']> = [
  'planificacion',
  'construccion',
  'acabados',
  'amenidades',
  'entrega',
];

export async function generateNarrativeArc(
  userId: string,
  seriesId: string | null,
  episodesCount: number,
  options: GenerateNarrativeArcOptions = {},
): Promise<GenerateNarrativeArcResult> {
  const fallbackArc = buildFallbackArc(episodesCount);

  if (process.env.NODE_ENV === 'test' || !process.env.ANTHROPIC_API_KEY) {
    return { arc: fallbackArc, costUsd: 0, aiGenerated: false };
  }

  try {
    const client = getDirectorClient();
    const propertyContext = await buildPropertyContext(options.desarrolloId);
    const prompt = `Genera arco narrativo documental ${episodesCount} episodios para proyecto inmobiliario.

Contexto:
- Titulo serie: ${options.title ?? 'Sin titulo'}
- Proyecto: ${propertyContext}

Devuelve JSON array con shape:
[{"episode_number":1,"phase":"planificacion|construccion|acabados|amenidades|entrega|custom","suggested_title":"...","suggested_duration_sec":60-120,"key_visuals":["..."]}, ...]

Reglas:
- Phase debe progresar logicamente (planificacion → entrega).
- Titulos motivacionales en espanol mexicano, sin clickbait.
- key_visuals: 3-5 sustantivos concretos por episodio.
- duration: 60-120 segundos.

Responde SOLO el JSON array, sin texto adicional.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { arc: fallbackArc, costUsd: 0, aiGenerated: false };
    }
    const parsed = parseArcJson(textBlock.text, episodesCount);
    if (!parsed) return { arc: fallbackArc, costUsd: 0, aiGenerated: false };

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const costUsd = (inputTokens / 1000) * 0.001 + (outputTokens / 1000) * 0.005;

    if (seriesId) {
      const supabase = createAdminClient();
      await supabase.from('studio_api_jobs').insert({
        user_id: userId,
        provider: 'anthropic',
        job_type: 'narrative_arc_generation',
        status: 'completed',
        actual_cost_usd: costUsd,
        input_payload: { series_id: seriesId, episodes_count: episodesCount } as never,
      });
    }

    return { arc: parsed, costUsd, aiGenerated: true };
  } catch (err) {
    sentry.captureException(err, { tags: { feature: 'dmx-studio.series.narrative-generator' } });
    return { arc: fallbackArc, costUsd: 0, aiGenerated: false };
  }
}

async function buildPropertyContext(desarrolloId?: string): Promise<string> {
  if (!desarrolloId) return 'Proyecto inmobiliario residencial generico';
  try {
    const { getDesarrolloDetails } = await import('@/shared/lib/desarrollos-cross-feature');
    const details = await getDesarrolloDetails(desarrolloId);
    if (!details) return 'Proyecto inmobiliario residencial generico';
    return `${details.nombre} (${details.ciudad ?? '?'}, ${details.colonia ?? '?'})`;
  } catch {
    return 'Proyecto inmobiliario residencial generico';
  }
}

function buildFallbackArc(episodesCount: number): ReadonlyArray<NarrativeArcEpisode> {
  return Array.from({ length: episodesCount }, (_, idx) => {
    const epNumber = idx + 1;
    const phaseIdx = Math.min(idx, DEFAULT_PHASES_5.length - 1);
    const phase = DEFAULT_PHASES_5[phaseIdx] ?? 'custom';
    return {
      episode_number: epNumber,
      phase,
      suggested_title: `Capitulo ${epNumber}`,
      suggested_duration_sec: 75,
      key_visuals: ['proyecto', 'fachada', 'detalles'],
    };
  });
}

function parseArcJson(
  text: string,
  expectedCount: number,
): ReadonlyArray<NarrativeArcEpisode> | null {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start < 0 || end < 0) return null;
    const slice = text.slice(start, end + 1);
    const arr = JSON.parse(slice) as Array<Record<string, unknown>>;
    if (!Array.isArray(arr)) return null;
    const validPhases = new Set<string>([
      'planificacion',
      'construccion',
      'acabados',
      'amenidades',
      'entrega',
      'custom',
    ]);
    const valid = arr.filter(
      (it) =>
        typeof it.episode_number === 'number' &&
        typeof it.suggested_title === 'string' &&
        typeof it.phase === 'string' &&
        validPhases.has(it.phase),
    );
    if (valid.length === 0) return null;
    return valid.slice(0, expectedCount).map((it) => ({
      episode_number: it.episode_number as number,
      phase: it.phase as NarrativeArcEpisode['phase'],
      suggested_title: it.suggested_title as string,
      suggested_duration_sec:
        typeof it.suggested_duration_sec === 'number' ? it.suggested_duration_sec : 75,
      key_visuals: Array.isArray(it.key_visuals)
        ? (it.key_visuals as Array<unknown>).filter((v): v is string => typeof v === 'string')
        : [],
    }));
  } catch {
    return null;
  }
}
