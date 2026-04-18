import { generateObject } from 'ai';
import { generativeSpecSchema } from '@/features/ia-generativa/schemas/generative-spec';
import { resolveModel } from '@/shared/lib/ai/providers';
import { createClient } from '@/shared/lib/supabase/server';

type GenerateComponentBody = {
  prompt: string;
  context?: unknown;
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

  const body = (await req.json()) as GenerateComponentBody;
  if (!body.prompt || body.prompt.length > 2_000) {
    return Response.json({ error: 'invalid_prompt' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: resolveModel('primary'),
      schema: generativeSpecSchema,
      prompt: buildPrompt(body.prompt, body.context),
    });
    return Response.json({ spec: object });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'generate_component_failed' },
      { status: 500 },
    );
  }
}

function buildPrompt(userPrompt: string, context: unknown): string {
  const parts = [
    'Selecciona el tipo de componente que mejor responde a la solicitud del usuario',
    '(stat_card | comparison_table | mini_map | timeline | cta_card) y devuelve un spec',
    'válido. Responde SIEMPRE en español. Si falta información, inventa valores plausibles',
    'con números redondeados.',
  ];
  if (context) parts.push(`Contexto: ${JSON.stringify(context).slice(0, 800)}.`);
  parts.push(`Solicitud: ${userPrompt}`);
  return parts.join(' ');
}
