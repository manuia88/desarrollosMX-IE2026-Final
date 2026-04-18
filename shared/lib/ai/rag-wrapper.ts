import type { SupabaseClient } from '@supabase/supabase-js';
import type { ModelMessage } from 'ai';
import type { Database } from '@/shared/types/database';
import { generateAI } from './generate';
import type { ModelCategory } from './providers';
import { type RagMatch, type RagOpts, rag } from './rag';

type GenerateAIWithRAGOpts = {
  supabase: SupabaseClient<Database>;
  query: string;
  userId: string;
  category?: ModelCategory;
  fallbackCategory?: ModelCategory;
  ragOpts?: RagOpts;
  extraMessages?: ModelMessage[];
  systemPrompt?: string;
  maxOutputTokens?: number;
};

const DEFAULT_SYSTEM =
  'Eres DMX Copilot. Responde en español citando con [source_type:source_id] ' +
  'cada dato relevante. Si el contexto no aporta evidencia, di "no tengo datos ' +
  'verificables sobre esto" y evita inventar referencias.';

function buildContextBlock(matches: RagMatch[]): string {
  if (matches.length === 0) return '<context>no_matches</context>';
  const items = matches
    .map((m) => `- [${m.citation}] (sim=${m.similarity.toFixed(2)}): ${m.content}`)
    .join('\n');
  return `<context>\n${items}\n</context>`;
}

export async function generateAIWithRAG(opts: GenerateAIWithRAGOpts) {
  const matches = await rag(opts.supabase, opts.query, opts.ragOpts ?? {});
  const systemPrompt = [opts.systemPrompt ?? DEFAULT_SYSTEM, buildContextBlock(matches)].join(
    '\n\n',
  );

  const messages: ModelMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(opts.extraMessages ?? []),
    { role: 'user', content: opts.query },
  ];

  const result = await generateAI({
    category: opts.category ?? 'primary',
    messages,
    userId: opts.userId,
    ...(opts.fallbackCategory ? { fallbackCategory: opts.fallbackCategory } : {}),
    ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
  });

  return { text: result.text, matches };
}
