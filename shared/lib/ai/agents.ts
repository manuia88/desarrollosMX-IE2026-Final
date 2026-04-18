import type { SupabaseClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Database } from '@/shared/types/database';
import { generateAI } from './generate';
import { type ModelCategory, resolveModel } from './providers';

export type AgentId = 'router' | 'legal' | 'financial' | 'match' | 'marketing' | 'general';

export type Agent = {
  id: AgentId;
  systemPrompt: string;
  model: ModelCategory;
};

export const AGENTS: Record<AgentId, Agent> = {
  router: {
    id: 'router',
    systemPrompt:
      'Eres el router meta. Clasifica la intención del usuario en exactamente una categoría: ' +
      '"legal" (dudas legales, fiscales, contratos, RFC/CFDI, escrituración), ' +
      '"financial" (hipotecas, tasas, cálculo de comisiones, IVA, FX), ' +
      '"match" (matching entre contacto y proyecto, búsquedas activas, recomendaciones), ' +
      '"marketing" (copy, landings, WhatsApp templates, QR), ' +
      '"general" (cualquier otro caso). Devuelve el id y una razón corta.',
    model: 'fast',
  },
  legal: {
    id: 'legal',
    systemPrompt:
      'Eres experto legal inmobiliario MX/CO/AR/BR/CL. Responde en español con precisión ' +
      'jurídica y cita siempre fuente cuando aplique [source_type:source_id]. Advierte sobre ' +
      'diferencias por jurisdicción.',
    model: 'legal',
  },
  financial: {
    id: 'financial',
    systemPrompt:
      'Eres experto financiero inmobiliario. Calcula comisiones (ventas + IVA 16% MX), ' +
      'hipotecas, tasas, ROI, FX. Muestra fórmulas y números redondeados. Cita fuente con ' +
      '[source_type:source_id] cuando invoques datos externos.',
    model: 'financial',
  },
  match: {
    id: 'match',
    systemPrompt:
      'Eres experto en matching buyer↔property. Apoya con recomendaciones precisas usando ' +
      'datos visibles del contexto. Cita con [project:<id>] o [unit:<id>] cada sugerencia.',
    model: 'match',
  },
  marketing: {
    id: 'marketing',
    systemPrompt:
      'Eres copywriter inmobiliario LATAM. Escribe copy conciso, con CTA claros, orientado a ' +
      'conversión. Ajusta el tono por país (mx/co/ar/br/cl) cuando el contexto lo indique.',
    model: 'marketing',
  },
  general: {
    id: 'general',
    systemPrompt:
      'Eres asistente general DesarrollosMX. Responde en español, directo y accionable. Si el ' +
      'tema se sale de tu conocimiento verificable, dilo y ofrece derivar a un especialista.',
    model: 'primary',
  },
};

const routeSchema = z.object({
  agent: z.enum(['legal', 'financial', 'match', 'marketing', 'general']),
  reason: z.string().min(1).max(240),
});

export type RouteDecision = z.infer<typeof routeSchema>;

export async function routeQuery(query: string, contextSummary?: string): Promise<RouteDecision> {
  const { object } = await generateObject({
    model: resolveModel(AGENTS.router.model),
    schema: routeSchema,
    prompt: [
      AGENTS.router.systemPrompt,
      contextSummary ? `Contexto: ${contextSummary}` : null,
      `Query: ${query}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  });
  return object;
}

export type OrchestrateOpts = {
  query: string;
  userId: string;
  supabase?: SupabaseClient<Database>;
  contextSummary?: string;
  fallbackCategory?: ModelCategory;
};

export type OrchestrateResult = {
  agent: AgentId;
  reason: string;
  text: string;
};

export async function orchestrate(opts: OrchestrateOpts): Promise<OrchestrateResult> {
  const route = await routeQuery(opts.query, opts.contextSummary);
  const agent = AGENTS[route.agent];

  const res = await generateAI({
    category: agent.model,
    userId: opts.userId,
    messages: [
      { role: 'system', content: agent.systemPrompt },
      ...(opts.contextSummary
        ? [{ role: 'system' as const, content: `Contexto: ${opts.contextSummary}` }]
        : []),
      { role: 'user', content: opts.query },
    ],
    ...(opts.fallbackCategory ? { fallbackCategory: opts.fallbackCategory } : {}),
  });

  return {
    agent: agent.id,
    reason: route.reason,
    text: res.text,
  };
}
