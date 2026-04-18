import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { resolveModel } from '@/shared/lib/ai/providers';
import { createClient } from '@/shared/lib/supabase/server';

type CopilotBody = {
  messages: UIMessage[];
  context?: {
    module: string;
    entity?: { type: string; id: string };
    visibleData?: Record<string, unknown>;
  } | null;
};

function buildSystemPrompt(context: CopilotBody['context']): string {
  const base =
    'Eres DMX Copilot, asistente AI-native de la plataforma DesarrollosMX. ' +
    'Responde en español con tono claro y profesional. Si citas datos, ' +
    'incluye la referencia como [source_type:source_id]. Si no tienes ' +
    'datos verificables, di "no tengo datos verificables sobre esto".';
  if (!context) return base;
  const parts = [base, `Contexto activo: módulo=${context.module}.`];
  if (context.entity) parts.push(`Entidad: ${context.entity.type}:${context.entity.id}.`);
  if (context.visibleData) parts.push(`Datos visibles: ${JSON.stringify(context.visibleData)}.`);
  return parts.join(' ');
}

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

  const body = (await req.json()) as CopilotBody;
  const modelMessages = await convertToModelMessages(body.messages ?? []);

  const result = streamText({
    model: resolveModel('primary'),
    system: buildSystemPrompt(body.context ?? null),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
