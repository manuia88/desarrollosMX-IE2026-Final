import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { type ModelCategory, resolveModel } from '@/shared/lib/ai/providers';
import { createClient } from '@/shared/lib/supabase/server';

const VALID_CATEGORIES: ReadonlySet<ModelCategory> = new Set([
  'primary',
  'fast',
  'legal',
  'financial',
  'match',
  'marketing',
  'simple_task',
]);

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

  const body = (await req.json()) as { messages: UIMessage[]; category?: ModelCategory };
  const category: ModelCategory = VALID_CATEGORIES.has(body.category as ModelCategory)
    ? (body.category as ModelCategory)
    : 'primary';

  const modelMessages = await convertToModelMessages(body.messages ?? []);
  const result = streamText({
    model: resolveModel(category),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
