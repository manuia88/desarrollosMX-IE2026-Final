import { generateObject } from 'ai';
import { z } from 'zod';
import { resolveModel } from '@/shared/lib/ai/providers';
import { createClient } from '@/shared/lib/supabase/server';

const suggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(3).max(80),
        prompt: z.string().min(3).max(300),
      }),
    )
    .min(2)
    .max(5),
});

type SuggestionsBody = {
  context?: {
    module: string;
    entity?: { type: string; id: string };
    visibleData?: Record<string, unknown>;
  } | null;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = (await req.json().catch(() => ({}))) as SuggestionsBody;

  try {
    const { object } = await generateObject({
      model: resolveModel('fast'),
      schema: suggestionsSchema,
      prompt: buildPrompt(body.context ?? null),
    });
    return Response.json(object);
  } catch (err) {
    return Response.json(
      { suggestions: [], error: err instanceof Error ? err.message : 'suggestions_failed' },
      { status: 200 },
    );
  }
}

function buildPrompt(context: SuggestionsBody['context']): string {
  const base =
    'Eres DMX Copilot. Genera 3 sugerencias cortas de acciones útiles (español MX) ' +
    'que el usuario podría querer realizar ahora mismo. Devuelve un id único por item, ' +
    'un label corto (≤8 palabras) y un prompt completo (≤25 palabras) que se ' +
    'enviaría al Copilot si el usuario acepta la sugerencia.';
  if (!context) {
    return `${base} Sin contexto específico — usa defaults de onboarding y tareas comunes.`;
  }
  const parts = [base, `Módulo activo: ${context.module}.`];
  if (context.entity) parts.push(`Entidad: ${context.entity.type}:${context.entity.id}.`);
  if (context.visibleData) parts.push(`Datos visibles: ${JSON.stringify(context.visibleData)}.`);
  return parts.join(' ');
}
